"""Repeated-state relation indexing and query-surface construction."""

from __future__ import annotations

from .contracts import (
    IngestedCorpus,
    OccurrenceRecord,
    RepeatedStateQuerySurface,
    StateRelationRecord,
)


class RepeatedStateQuerySurfaceBuilder:
    def build(self, ingested_corpus: IngestedCorpus) -> RepeatedStateQuerySurface:
        occurrences_by_state_key: dict[str, list[OccurrenceRecord]] = {}

        for occurrence in ingested_corpus.occurrences:
            occurrences_by_state_key.setdefault(occurrence.state_key, []).append(occurrence)

        relations = tuple(
            StateRelationRecord(
                state_key=state_key,
                occurrences=tuple(occurrences),
            )
            for state_key, occurrences in occurrences_by_state_key.items()
        )
        return RepeatedStateQuerySurface.from_relations(relations)