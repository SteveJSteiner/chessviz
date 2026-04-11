"""Placeholder DAG assembly seam for the builder package."""

from __future__ import annotations

from .contracts import CorpusDeclaration, DagArtifact, IngestedCorpus


class PlaceholderDagBuilder:
    def build(
        self,
        declaration: CorpusDeclaration,
        ingested_corpus: IngestedCorpus,
    ) -> DagArtifact:
        return DagArtifact(
            nodes=ingested_corpus.occurrences,
            edges=tuple(
                (transition.parent_occurrence_id, transition.child_occurrence_id)
                for transition in ingested_corpus.transitions
            ),
            source_name=declaration.source_name,
        )