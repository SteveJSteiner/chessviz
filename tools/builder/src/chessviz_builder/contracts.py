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
class OccurrenceTransition:
    parent_occurrence_id: str
    child_occurrence_id: str
    move_uci: str
    ply: int


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
class DagArtifact:
    nodes: tuple[OccurrenceRecord, ...]
    edges: tuple[tuple[str, str], ...]
    source_name: str


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
    ) -> DagArtifact:
        """Build a DAG artifact from ingested occurrence paths."""


class RepeatedStateQueryBuilder(Protocol):
    def build(self, ingested_corpus: IngestedCorpus) -> RepeatedStateQuerySurface:
        """Build a repeated-state query surface from ingested occurrences."""


class OccurrenceLabeler(Protocol):
    def label(self, dag: DagArtifact) -> Mapping[str, str]:
        """Attach placeholder labels pending later roadmap nodes."""


class EmbeddingBuilder(Protocol):
    def build(self, dag: DagArtifact) -> EmbeddingArtifact:
        """Build placeholder coordinates pending hyperbolic embedding work."""