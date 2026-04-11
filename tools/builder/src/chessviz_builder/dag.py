"""Occurrence DAG assembly and metric validation helpers."""

from __future__ import annotations

from .contracts import (
    CorpusDeclaration,
    DagArtifact,
    DagMetrics,
    IngestedCorpus,
    RepeatedStateQuerySurface,
)


class OccurrenceDagBuilder:
    def build(
        self,
        declaration: CorpusDeclaration,
        ingested_corpus: IngestedCorpus,
        repeated_state_query_surface: RepeatedStateQuerySurface,
    ) -> DagArtifact:
        nodes = ingested_corpus.occurrences
        edges = tuple(
            (transition.parent_occurrence_id, transition.child_occurrence_id)
            for transition in ingested_corpus.transitions
        )
        nodes_by_occurrence_id = {
            occurrence.occurrence_id: occurrence for occurrence in nodes
        }
        parent_lists = {occurrence_id: [] for occurrence_id in nodes_by_occurrence_id}
        child_lists = {occurrence_id: [] for occurrence_id in nodes_by_occurrence_id}

        for parent_id, child_id in edges:
            child_lists[parent_id].append(child_id)
            parent_lists[child_id].append(parent_id)

        parents_by_occurrence_id = {
            occurrence_id: tuple(parent_ids)
            for occurrence_id, parent_ids in parent_lists.items()
        }
        children_by_occurrence_id = {
            occurrence_id: tuple(child_ids)
            for occurrence_id, child_ids in child_lists.items()
        }
        root_occurrence_ids = tuple(
            occurrence_id
            for occurrence_id, parent_ids in parents_by_occurrence_id.items()
            if not parent_ids
        )
        leaf_occurrence_ids = tuple(
            occurrence_id
            for occurrence_id, child_ids in children_by_occurrence_id.items()
            if not child_ids
        )
        metrics = DagMetrics(
            node_count=len(nodes),
            edge_count=len(edges),
            root_count=len(root_occurrence_ids),
            leaf_count=len(leaf_occurrence_ids),
            max_out_degree=max((len(child_ids) for child_ids in child_lists.values()), default=0),
            max_in_degree=max((len(parent_ids) for parent_ids in parent_lists.values()), default=0),
            repeated_state_group_count=len(repeated_state_query_surface.repeated_relations),
            repeated_state_occurrence_count=sum(
                len(relation.occurrences)
                for relation in repeated_state_query_surface.repeated_relations
            ),
            max_state_convergence=max(
                (len(relation.occurrences) for relation in repeated_state_query_surface.relations),
                default=0,
            ),
        )

        return DagArtifact(
            nodes=nodes,
            edges=edges,
            source_name=declaration.source_name,
            root_occurrence_ids=root_occurrence_ids,
            leaf_occurrence_ids=leaf_occurrence_ids,
            metrics=metrics,
            _nodes_by_occurrence_id=nodes_by_occurrence_id,
            _parents_by_occurrence_id=parents_by_occurrence_id,
            _children_by_occurrence_id=children_by_occurrence_id,
        )