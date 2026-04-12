"""Builder-owned opening-table import/export normalization."""

from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .contracts import CoverageMetadataRecord, RecordProvenance
from .labeling import OPENING_PHASE
from .pipeline import PipelineDryRun
from .publication import payload_sha256

FOREIGN_OPENING_BOOK_FORMAT = "foreign-opening-book-json"
_OPENING_SHARD_WIDTH = 4


@dataclass(frozen=True)
class OpeningBookImportRecord:
    board_state: str
    reply_uci: str
    reply_san: str
    book_weight: int
    sample_count: int
    next_board_state: str
    coverage_ply: int


@dataclass(frozen=True)
class OpeningTableMoveRecord:
    move_uci: str
    move_san: str
    continuation_position_key: str
    weight: int
    frequency: float


@dataclass(frozen=True)
class OpeningTablePositionRecord:
    position_key: str
    max_coverage_ply: int
    total_sample_count: int
    moves: tuple[OpeningTableMoveRecord, ...]
    provenance: RecordProvenance


@dataclass(frozen=True)
class OpeningTablePublication:
    asset_set_id: str
    source_name: str
    source_version: str
    source_location: str
    source_hash: str
    source_provenance: RecordProvenance
    coverage_metadata: CoverageMetadataRecord
    records: tuple[OpeningTablePositionRecord, ...]


def import_opening_table(
    source_path: Path,
    dry_run: PipelineDryRun,
) -> OpeningTablePublication:
    payload = _load_payload(source_path)
    source_name = _required_text(payload, "source_name")
    source_version = _required_text(payload, "source_version")
    source_location = _required_text(payload, "source_location")
    source_format = _required_text(payload, "source_format")

    if source_format != FOREIGN_OPENING_BOOK_FORMAT:
        raise ValueError(
            "opening import source has unsupported source_format: "
            f"{source_format!r}"
        )

    import_records = tuple(
        sorted(
            (_parse_import_record(index, record) for index, record in enumerate(_records(payload))),
            key=_import_record_sort_key,
        )
    )
    if not import_records:
        raise ValueError("opening import source has no records")

    _validate_import_records(import_records, dry_run)

    source_hash = payload_sha256(
        {
            "sourceName": source_name,
            "sourceVersion": source_version,
            "sourceLocation": source_location,
            "sourceFormat": source_format,
            "records": [
                _import_record_payload(record) for record in import_records
            ],
        }
    )

    grouped_records: dict[str, list[OpeningBookImportRecord]] = defaultdict(list)
    for record in import_records:
        grouped_records[record.board_state].append(record)

    normalized_records: list[OpeningTablePositionRecord] = []
    for position_key in sorted(grouped_records):
        position_records = sorted(
            grouped_records[position_key],
            key=lambda record: (
                -record.book_weight,
                -record.sample_count,
                record.reply_uci,
                record.next_board_state,
            ),
        )
        total_sample_count = sum(record.sample_count for record in position_records)
        moves = tuple(
            OpeningTableMoveRecord(
                move_uci=record.reply_uci,
                move_san=record.reply_san,
                continuation_position_key=record.next_board_state,
                weight=record.book_weight,
                frequency=round(record.sample_count / total_sample_count, 6),
            )
            for record in position_records
        )
        normalized_records.append(
            OpeningTablePositionRecord(
                position_key=position_key,
                max_coverage_ply=max(
                    record.coverage_ply for record in position_records
                ),
                total_sample_count=total_sample_count,
                moves=moves,
                provenance=RecordProvenance(
                    source_kind="opening-table-import",
                    source_name=source_name,
                    source_version=source_version,
                    source_location=source_location,
                    detail=(
                        f"normalized {len(position_records)} imported opening "
                        f"continuation(s) for {position_key}"
                    ),
                ),
            )
        )

    normalized_records_tuple = tuple(normalized_records)
    coverage_metadata = CoverageMetadataRecord(
        coverage_metadata_id=_coverage_metadata_id(),
        regime_id="opening-table",
        coverage_kind="ply-window",
        summary=(
            "Imported opening-table coverage published as project-owned "
            "continuation shards."
        ),
        occurrence_count=len(normalized_records_tuple),
        max_ply=max(record.max_coverage_ply for record in normalized_records_tuple),
    )
    source_provenance = RecordProvenance(
        source_kind="opening-book-import",
        source_name=source_name,
        source_version=source_version,
        source_location=source_location,
        detail=(
            f"normalized {len(import_records)} foreign opening-book record(s) into "
            f"{len(normalized_records_tuple)} project-owned opening position(s)"
        ),
    )

    return OpeningTablePublication(
        asset_set_id=f"opening-table:{source_name}:{source_version}",
        source_name=source_name,
        source_version=source_version,
        source_location=source_location,
        source_hash=source_hash,
        source_provenance=source_provenance,
        coverage_metadata=coverage_metadata,
        records=normalized_records_tuple,
    )


def shard_opening_table_records(
    publication: OpeningTablePublication,
) -> tuple[tuple[str, tuple[dict[str, Any], ...]], ...]:
    buckets: dict[str, list[OpeningTablePositionRecord]] = defaultdict(list)
    for record in publication.records:
        buckets[_shard_id_for_record(record)].append(record)

    return tuple(
        (
            shard_id,
            tuple(
                _position_record_payload(record)
                for record in sorted(
                    shard_records,
                    key=lambda current_record: current_record.position_key,
                )
            ),
        )
        for shard_id, shard_records in sorted(buckets.items())
    )


def _load_payload(source_path: Path) -> dict[str, Any]:
    return json.loads(source_path.read_text(encoding="utf-8"))


def _records(payload: dict[str, Any]) -> list[Any]:
    records = payload.get("records")
    if not isinstance(records, list):
        raise ValueError("opening import source must include a records list")
    return records


def _parse_import_record(index: int, payload: Any) -> OpeningBookImportRecord:
    if not isinstance(payload, dict):
        raise ValueError(f"opening import record {index} must be an object")

    return OpeningBookImportRecord(
        board_state=_required_text(payload, "board_state"),
        reply_uci=_required_text(payload, "reply_uci"),
        reply_san=_required_text(payload, "reply_san"),
        book_weight=int(payload["book_weight"]),
        sample_count=int(payload["sample_count"]),
        next_board_state=_required_text(payload, "next_board_state"),
        coverage_ply=int(payload["coverage_ply"]),
    )


def _validate_import_records(
    import_records: tuple[OpeningBookImportRecord, ...],
    dry_run: PipelineDryRun,
) -> None:
    opening_state_keys = {
        occurrence.state_key
        for occurrence in dry_run.occurrences
        if (
            label_record := dry_run.labels.by_occurrence_id(occurrence.occurrence_id)
        )
        is not None
        and label_record.phase == OPENING_PHASE
    }
    known_state_keys = {occurrence.state_key for occurrence in dry_run.occurrences}
    seen_edges: set[tuple[str, str, str]] = set()

    for record in import_records:
        if record.board_state not in opening_state_keys:
            raise ValueError(
                "opening import source record falls outside declared opening coverage: "
                f"{record.board_state}"
            )
        if record.next_board_state not in known_state_keys:
            raise ValueError(
                "opening import source record points to an unknown continuation state: "
                f"{record.next_board_state}"
            )
        if record.book_weight <= 0:
            raise ValueError("opening import source record has non-positive book_weight")
        if record.sample_count <= 0:
            raise ValueError("opening import source record has non-positive sample_count")
        if record.coverage_ply < 0:
            raise ValueError("opening import source record has negative coverage_ply")

        edge = (record.board_state, record.reply_uci, record.next_board_state)
        if edge in seen_edges:
            raise ValueError(
                "opening import source contains a duplicate normalized continuation edge"
            )
        seen_edges.add(edge)


def _import_record_sort_key(
    record: OpeningBookImportRecord,
) -> tuple[str, int, str, str]:
    return (
        record.board_state,
        record.coverage_ply,
        record.reply_uci,
        record.next_board_state,
    )


def _import_record_payload(record: OpeningBookImportRecord) -> dict[str, Any]:
    return {
        "boardState": record.board_state,
        "replyUci": record.reply_uci,
        "replySan": record.reply_san,
        "bookWeight": record.book_weight,
        "sampleCount": record.sample_count,
        "nextBoardState": record.next_board_state,
        "coveragePly": record.coverage_ply,
    }


def _position_record_payload(record: OpeningTablePositionRecord) -> dict[str, Any]:
    return {
        "positionKey": record.position_key,
        "maxCoveragePly": record.max_coverage_ply,
        "totalSampleCount": record.total_sample_count,
        "moves": [
            {
                "moveUci": move.move_uci,
                "moveSan": move.move_san,
                "continuationPositionKey": move.continuation_position_key,
                "weight": move.weight,
                "frequency": move.frequency,
            }
            for move in record.moves
        ],
        "provenance": _provenance_payload(record.provenance),
    }


def _provenance_payload(record: RecordProvenance) -> dict[str, str]:
    return {
        "sourceKind": record.source_kind,
        "sourceName": record.source_name,
        "sourceVersion": record.source_version,
        "sourceLocation": record.source_location,
        "detail": record.detail,
    }


def _shard_id_for_record(record: OpeningTablePositionRecord) -> str:
    band_start = (record.max_coverage_ply // _OPENING_SHARD_WIDTH) * _OPENING_SHARD_WIDTH
    band_end = band_start + (_OPENING_SHARD_WIDTH - 1)
    return f"ply-{band_start:03d}-{band_end:03d}"


def _required_text(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"opening import source requires non-empty {key!r}")
    return value.strip()


def _coverage_metadata_id() -> str:
    return "coverage:opening-table"