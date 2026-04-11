"""Placeholder DAG assembly seam for the builder package."""

from __future__ import annotations

from typing import Sequence

from .contracts import CorpusDeclaration, DagArtifact, OccurrenceRecord


class PlaceholderDagBuilder:
    def build(
        self,
        declaration: CorpusDeclaration,
        occurrences: Sequence[OccurrenceRecord],
    ) -> DagArtifact:
        return DagArtifact(
            nodes=tuple(occurrences),
            edges=tuple(),
            source_name=declaration.source_name,
        )