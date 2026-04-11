"""Shared builder interfaces for the placeholder builder pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Protocol, Sequence

import chess

Vector3 = tuple[float, float, float]


@dataclass(frozen=True)
class BuilderWorkspace:
    repository_root: Path
    artifact_root: Path
    builder_manifest: Path
    viewer_scene_manifest: Path
    stockfish_bin: Path | None
    syzygy_dir: Path | None


@dataclass(frozen=True)
class CorpusDeclaration:
    source_name: str
    version: str
    location: str


@dataclass(frozen=True)
class StateKeyComponents:
    board_fen: str
    turn: str
    castling: str
    legal_en_passant: str

    @property
    def canonical_key(self) -> str:
        return " ".join(
            (self.board_fen, self.turn, self.castling, self.legal_en_passant)
        )


@dataclass(frozen=True)
class OccurrenceRecord:
    occurrence_id: str
    state_key: str
    path: tuple[str, ...]


@dataclass(frozen=True)
class MoveFactRecord:
    san: str
    moving_piece: str
    captured_piece: str | None
    promotion_piece: str | None
    is_capture: bool
    is_check: bool
    is_checkmate: bool
    is_castle: bool
    castle_side: str | None
    is_en_passant: bool


@dataclass(frozen=True)
class OccurrenceTransition:
    parent_occurrence_id: str
    child_occurrence_id: str
    move_uci: str
    ply: int
    move_facts: MoveFactRecord


@dataclass(frozen=True)
class IngestedGame:
    game_id: str
    occurrences: tuple[OccurrenceRecord, ...]
    transitions: tuple[OccurrenceTransition, ...]


@dataclass(frozen=True)
class IngestedCorpus:
    declaration: CorpusDeclaration
    games: tuple[IngestedGame, ...]

    @property
    def occurrences(self) -> tuple[OccurrenceRecord, ...]:
        return tuple(
            occurrence
            for game in self.games
            for occurrence in game.occurrences
        )

    @property
    def transitions(self) -> tuple[OccurrenceTransition, ...]:
        return tuple(
            transition
            for game in self.games
            for transition in game.transitions
        )


@dataclass(frozen=True)
class StateRelationRecord:
    state_key: str
    occurrences: tuple[OccurrenceRecord, ...]

    @property
    def occurrence_ids(self) -> tuple[str, ...]:
        return tuple(occurrence.occurrence_id for occurrence in self.occurrences)

    @property
    def is_repeated(self) -> bool:
        return len(self.occurrences) > 1


@dataclass(frozen=True)
class RepeatedStateQuerySurface:
    relations: tuple[StateRelationRecord, ...]
    _relations_by_state_key: Mapping[str, StateRelationRecord]
    _relations_by_occurrence_id: Mapping[str, StateRelationRecord]

    @classmethod
    def from_relations(
        cls,
        relations: Sequence[StateRelationRecord],
    ) -> "RepeatedStateQuerySurface":
        ordered_relations = tuple(relations)
        return cls(
            relations=ordered_relations,
            _relations_by_state_key={
                relation.state_key: relation for relation in ordered_relations
            },
            _relations_by_occurrence_id={
                occurrence.occurrence_id: relation
                for relation in ordered_relations
                for occurrence in relation.occurrences
            },
        )

    @property
    def repeated_relations(self) -> tuple[StateRelationRecord, ...]:
        return tuple(relation for relation in self.relations if relation.is_repeated)

    @property
    def singleton_relations(self) -> tuple[StateRelationRecord, ...]:
        return tuple(relation for relation in self.relations if not relation.is_repeated)

    def by_state_key(self, state_key: str) -> StateRelationRecord | None:
        return self._relations_by_state_key.get(state_key)

    def by_occurrence_id(self, occurrence_id: str) -> StateRelationRecord | None:
        return self._relations_by_occurrence_id.get(occurrence_id)


@dataclass(frozen=True)
class OccurrenceLabelRecord:
    occurrence_id: str
    phase: str
    material_signature: str


@dataclass(frozen=True)
class OccurrenceLabelQuerySurface:
    records: tuple[OccurrenceLabelRecord, ...]
    _records_by_occurrence_id: Mapping[str, OccurrenceLabelRecord]
    _records_by_phase: Mapping[str, tuple[OccurrenceLabelRecord, ...]]
    _records_by_material_signature: Mapping[str, tuple[OccurrenceLabelRecord, ...]]
    _records_by_phase_and_material_signature: Mapping[
        tuple[str, str], tuple[OccurrenceLabelRecord, ...]
    ]

    @classmethod
    def from_records(
        cls,
        records: Sequence[OccurrenceLabelRecord],
    ) -> "OccurrenceLabelQuerySurface":
        ordered_records = tuple(records)
        phase_buckets: dict[str, list[OccurrenceLabelRecord]] = {}
        material_buckets: dict[str, list[OccurrenceLabelRecord]] = {}
        phase_material_buckets: dict[
            tuple[str, str], list[OccurrenceLabelRecord]
        ] = {}

        for record in ordered_records:
            phase_buckets.setdefault(record.phase, []).append(record)
            material_buckets.setdefault(record.material_signature, []).append(record)
            phase_material_buckets.setdefault(
                (record.phase, record.material_signature),
                [],
            ).append(record)

        return cls(
            records=ordered_records,
            _records_by_occurrence_id={
                record.occurrence_id: record for record in ordered_records
            },
            _records_by_phase={
                phase: tuple(phase_records)
                for phase, phase_records in phase_buckets.items()
            },
            _records_by_material_signature={
                material_signature: tuple(material_records)
                for material_signature, material_records in material_buckets.items()
            },
            _records_by_phase_and_material_signature={
                phase_and_material: tuple(label_records)
                for phase_and_material, label_records in phase_material_buckets.items()
            },
        )

    @property
    def phases(self) -> tuple[str, ...]:
        return tuple(self._records_by_phase)

    @property
    def material_signatures(self) -> tuple[str, ...]:
        return tuple(self._records_by_material_signature)

    def __len__(self) -> int:
        return len(self.records)

    def by_occurrence_id(self, occurrence_id: str) -> OccurrenceLabelRecord | None:
        return self._records_by_occurrence_id.get(occurrence_id)

    def for_phase(self, phase: str) -> tuple[OccurrenceLabelRecord, ...]:
        return self._records_by_phase.get(phase, tuple())

    def for_material_signature(
        self,
        material_signature: str,
    ) -> tuple[OccurrenceLabelRecord, ...]:
        return self._records_by_material_signature.get(material_signature, tuple())

    def for_phase_and_material_signature(
        self,
        phase: str,
        material_signature: str,
    ) -> tuple[OccurrenceLabelRecord, ...]:
        return self._records_by_phase_and_material_signature.get(
            (phase, material_signature),
            tuple(),
        )


@dataclass(frozen=True)
class DagMetrics:
    node_count: int
    edge_count: int
    root_count: int
    leaf_count: int
    max_out_degree: int
    max_in_degree: int
    repeated_state_group_count: int
    repeated_state_occurrence_count: int
    max_state_convergence: int


@dataclass(frozen=True)
class DagArtifact:
    nodes: tuple[OccurrenceRecord, ...]
    edges: tuple[tuple[str, str], ...]
    source_name: str
    root_occurrence_ids: tuple[str, ...]
    leaf_occurrence_ids: tuple[str, ...]
    metrics: DagMetrics
    _nodes_by_occurrence_id: Mapping[str, OccurrenceRecord]
    _parents_by_occurrence_id: Mapping[str, tuple[str, ...]]
    _children_by_occurrence_id: Mapping[str, tuple[str, ...]]

    def by_occurrence_id(self, occurrence_id: str) -> OccurrenceRecord | None:
        return self._nodes_by_occurrence_id.get(occurrence_id)

    def parents_of(self, occurrence_id: str) -> tuple[OccurrenceRecord, ...]:
        return tuple(
            self._nodes_by_occurrence_id[parent_id]
            for parent_id in self._parents_by_occurrence_id.get(occurrence_id, tuple())
        )

    def children_of(self, occurrence_id: str) -> tuple[OccurrenceRecord, ...]:
        return tuple(
            self._nodes_by_occurrence_id[child_id]
            for child_id in self._children_by_occurrence_id.get(occurrence_id, tuple())
        )

    def in_degree(self, occurrence_id: str) -> int:
        return len(self._parents_by_occurrence_id.get(occurrence_id, tuple()))

    def out_degree(self, occurrence_id: str) -> int:
        return len(self._children_by_occurrence_id.get(occurrence_id, tuple()))


@dataclass(frozen=True)
class EmbeddingArtifact:
    dag: DagArtifact
    coordinates: Mapping[str, Vector3]


class StateKeyProvider(Protocol):
    def components_for_board(self, board: chess.Board) -> StateKeyComponents:
        """Build canonical state-key components from a board alone."""

    def key_for_board(self, board: chess.Board) -> str:
        """Build a stable canonical key from a board alone."""


class OccurrenceIdentityProvider(Protocol):
    def identify(self, state_key: str, path: Sequence[str]) -> OccurrenceRecord:
        """Create a stable occurrence id from a state key and path."""


class CorpusIngestor(Protocol):
    def ingest(self, declaration: CorpusDeclaration) -> IngestedCorpus:
        """Convert a declared corpus slice into continuous occurrence paths."""


class DagBuilder(Protocol):
    def build(
        self,
        declaration: CorpusDeclaration,
        ingested_corpus: IngestedCorpus,
        repeated_state_query_surface: RepeatedStateQuerySurface,
    ) -> DagArtifact:
        """Build a DAG artifact from ingested occurrence paths."""


class RepeatedStateQueryBuilder(Protocol):
    def build(self, ingested_corpus: IngestedCorpus) -> RepeatedStateQuerySurface:
        """Build a repeated-state query surface from ingested occurrences."""


class OccurrenceLabeler(Protocol):
    def label(self, dag: DagArtifact) -> OccurrenceLabelQuerySurface:
        """Attach coarse phase/material labels without changing DAG topology."""


class EmbeddingBuilder(Protocol):
    def build(self, dag: DagArtifact) -> EmbeddingArtifact:
        """Build placeholder coordinates pending hyperbolic embedding work."""