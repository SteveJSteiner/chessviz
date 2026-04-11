"""Shared builder interfaces for the N00 placeholder pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Protocol, Sequence

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
class OccurrenceRecord:
    occurrence_id: str
    state_key: str
    path: tuple[str, ...]


@dataclass(frozen=True)
class DagArtifact:
    nodes: tuple[OccurrenceRecord, ...]
    edges: tuple[tuple[str, str], ...]
    source_name: str


@dataclass(frozen=True)
class EmbeddingArtifact:
    dag: DagArtifact
    coordinates: Mapping[str, Vector3]


class OccurrenceIdentityProvider(Protocol):
    def identify(self, state_key: str, path: Sequence[str]) -> OccurrenceRecord:
        """Create a stable occurrence id from a state key and path."""


class CorpusIngestor(Protocol):
    def ingest(self, declaration: CorpusDeclaration) -> tuple[OccurrenceRecord, ...]:
        """Convert a declared corpus slice into occurrence records."""


class DagBuilder(Protocol):
    def build(
        self,
        declaration: CorpusDeclaration,
        occurrences: Sequence[OccurrenceRecord],
    ) -> DagArtifact:
        """Build a DAG artifact from occurrence records."""


class OccurrenceLabeler(Protocol):
    def label(self, dag: DagArtifact) -> Mapping[str, str]:
        """Attach placeholder labels pending later roadmap nodes."""


class EmbeddingBuilder(Protocol):
    def build(self, dag: DagArtifact) -> EmbeddingArtifact:
        """Build placeholder coordinates pending hyperbolic embedding work."""