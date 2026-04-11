"""Placeholder embedding seam for future builder nodes."""

from __future__ import annotations

from .contracts import DagArtifact, EmbeddingArtifact


class PlaceholderEmbeddingBuilder:
    def build(self, dag: DagArtifact) -> EmbeddingArtifact:
        coordinates = {
            node.occurrence_id: (0.0, 0.0, float(index))
            for index, node in enumerate(dag.nodes)
        }
        return EmbeddingArtifact(dag=dag, coordinates=coordinates)