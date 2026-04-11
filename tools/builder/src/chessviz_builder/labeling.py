"""Placeholder labeling seam for future builder nodes."""

from __future__ import annotations

from typing import Mapping

from .contracts import DagArtifact


class PlaceholderOccurrenceLabeler:
    def label(self, dag: DagArtifact) -> Mapping[str, str]:
        return {node.occurrence_id: "unlabeled" for node in dag.nodes}