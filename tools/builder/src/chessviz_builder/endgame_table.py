"""Builder-owned endgame-table import/export normalization."""

from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .contracts import CoverageMetadataRecord, RecordProvenance
from .labeling import ENDGAME_PHASE
from .pipeline import PipelineDryRun
from .publication import payload_sha256, slugify_fragment
from .terminal_labeling import (
    BLACK_WIN_OUTCOME,
    BLACK_WIN_WDL,
    DRAW_OUTCOME,
    DRAW_WDL,
    WHITE_WIN_OUTCOME,
    WHITE_WIN_WDL,
)

FOREIGN_ENDGAME_TABLE_FORMAT = "foreign-endgame-table-json"

_OUTCOME_TO_WDL = {
    WHITE_WIN_OUTCOME: WHITE_WIN_WDL,
    DRAW_OUTCOME: DRAW_WDL,
    BLACK_WIN_OUTCOME: BLACK_WIN_WDL,
}


@dataclass(frozen=True)
class EndgameTableImportRecord:
    board_state: str
    material_class: str
    wdl_code: str
    table_score: float
    dtz: int


@dataclass(frozen=True)
class EndgameTablePositionRecord:
    position_key: str
    material_signature: str
    wdl_label: str
    outcome_class: str
    score: float
    distance_to_zeroing: int
    provenance: RecordProvenance


@dataclass(frozen=True)
class EndgameTablePublication:
    asset_set_id: str
    source_name: str
    source_version: str
    source_location: str
    source_hash: str
    source_provenance: RecordProvenance
    coverage_metadata: CoverageMetadataRecord
    records: tuple[EndgameTablePositionRecord, ...]


def import_endgame_table(
    source_path: Path,
    dry_run: PipelineDryRun,
) -> EndgameTablePublication:
    payload = _load_payload(source_path)
    source_name = _required_text(payload, "source_name")
    source_version = _required_text(payload, "source_version")
    source_location = _required_text(payload, "source_location")
    source_format = _required_text(payload, "source_format")

    if source_format != FOREIGN_ENDGAME_TABLE_FORMAT:
        raise ValueError(
            "endgame import source has unsupported source_format: "
            f"{source_format!r}"
        )

    import_records = tuple(
        sorted(
            (_parse_import_record(index, record) for index, record in enumerate(_records(payload))),
            key=_import_record_sort_key,
        )
    )
    if not import_records:
        raise ValueError("endgame import source has no records")

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

    normalized_records = tuple(
        EndgameTablePositionRecord(
            position_key=record.board_state,
            material_signature=record.material_class,
            wdl_label=_OUTCOME_TO_WDL[record.wdl_code],
            outcome_class=record.wdl_code,
            score=record.table_score,
            distance_to_zeroing=record.dtz,
            provenance=RecordProvenance(
                source_kind="endgame-table-import",
                source_name=source_name,
                source_version=source_version,
                source_location=source_location,
                detail=(
                    f"normalized imported endgame table record for {record.board_state}"
                ),
            ),
        )
        for record in import_records
    )
    coverage_metadata = CoverageMetadataRecord(
        coverage_metadata_id=_coverage_metadata_id(),
        regime_id="endgame-table",
        coverage_kind="material-signature-set",
        summary=(
            "Imported endgame-table coverage published as project-owned terminal "
            "evaluation shards."
        ),
        occurrence_count=len(normalized_records),
        supported_material_signatures=tuple(
            sorted({record.material_signature for record in normalized_records})
        ),
    )
    source_provenance = RecordProvenance(
        source_kind="endgame-table-import",
        source_name=source_name,
        source_version=source_version,
        source_location=source_location,
        detail=(
            f"normalized {len(import_records)} foreign endgame table record(s) into "
            f"{len(normalized_records)} project-owned endgame position(s)"
        ),
    )

    return EndgameTablePublication(
        asset_set_id=f"endgame-table:{source_name}:{source_version}",
        source_name=source_name,
        source_version=source_version,
        source_location=source_location,
        source_hash=source_hash,
        source_provenance=source_provenance,
        coverage_metadata=coverage_metadata,
        records=normalized_records,
    )


def shard_endgame_table_records(
    publication: EndgameTablePublication,
) -> tuple[tuple[str, tuple[dict[str, Any], ...]], ...]:
    buckets: dict[str, list[EndgameTablePositionRecord]] = defaultdict(list)
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
        raise ValueError("endgame import source must include a records list")
    return records


def _parse_import_record(index: int, payload: Any) -> EndgameTableImportRecord:
    if not isinstance(payload, dict):
        raise ValueError(f"endgame import record {index} must be an object")

    return EndgameTableImportRecord(
        board_state=_required_text(payload, "board_state"),
        material_class=_required_text(payload, "material_class"),
        wdl_code=_required_text(payload, "wdl_code"),
        table_score=float(payload["table_score"]),
        dtz=int(payload["dtz"]),
    )


def _validate_import_records(
    import_records: tuple[EndgameTableImportRecord, ...],
    dry_run: PipelineDryRun,
) -> None:
    endgame_material_by_state: dict[str, str] = {}
    for occurrence in dry_run.occurrences:
        label_record = dry_run.labels.by_occurrence_id(occurrence.occurrence_id)
        if label_record is None or label_record.phase != ENDGAME_PHASE:
            continue
        endgame_material_by_state.setdefault(
            occurrence.state_key,
            label_record.material_signature,
        )

    seen_positions: set[str] = set()
    allowed_outcomes = {
        WHITE_WIN_OUTCOME,
        DRAW_OUTCOME,
        BLACK_WIN_OUTCOME,
    }

    for record in import_records:
        expected_material_signature = endgame_material_by_state.get(record.board_state)
        if expected_material_signature is None:
            raise ValueError(
                "endgame import source record falls outside declared endgame coverage: "
                f"{record.board_state}"
            )
        if record.material_class != expected_material_signature:
            raise ValueError(
                "endgame import source material class does not match declared endgame "
                f"coverage for {record.board_state}"
            )
        if record.wdl_code not in allowed_outcomes:
            raise ValueError(
                "endgame import source record has unsupported wdl_code: "
                f"{record.wdl_code!r}"
            )
        if record.dtz < 0:
            raise ValueError("endgame import source record has negative dtz")
        if record.board_state in seen_positions:
            raise ValueError(
                "endgame import source contains a duplicate normalized position record"
            )
        seen_positions.add(record.board_state)


def _import_record_sort_key(
    record: EndgameTableImportRecord,
) -> tuple[str, str, str]:
    return (record.material_class, record.board_state, record.wdl_code)


def _import_record_payload(record: EndgameTableImportRecord) -> dict[str, Any]:
    return {
        "boardState": record.board_state,
        "materialClass": record.material_class,
        "wdlCode": record.wdl_code,
        "tableScore": record.table_score,
        "dtz": record.dtz,
    }


def _position_record_payload(record: EndgameTablePositionRecord) -> dict[str, Any]:
    return {
        "positionKey": record.position_key,
        "materialSignature": record.material_signature,
        "terminalPayload": {
            "wdlLabel": record.wdl_label,
            "outcomeClass": record.outcome_class,
            "distanceToZeroing": record.distance_to_zeroing,
        },
        "score": record.score,
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


def _shard_id_for_record(record: EndgameTablePositionRecord) -> str:
    return f"material-{slugify_fragment(record.material_signature)}"


def _required_text(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"endgame import source requires non-empty {key!r}")
    return value.strip()


def _coverage_metadata_id() -> str:
    return "coverage:endgame-table"