"""Fixture-backed checks for DAG assembly and metrics."""

from __future__ import annotations

import chess
import unittest

from chessviz_builder.corpus_ingest import initial_corpus_declaration
from chessviz_builder.pipeline import create_placeholder_pipeline
from chessviz_builder.state_key import CanonicalStateKeyProvider


TRANSPOSITION_SEQUENCE = ("d4", "Nf6", "c4", "e6", "Nc3", "Bb4")


def board_from_san(sequence: tuple[str, ...]) -> chess.Board:
    board = chess.Board()
    for move in sequence:
        board.push_san(move)
    return board


class DagArtifactTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = create_placeholder_pipeline()
        self.declaration = initial_corpus_declaration()
        self.state_key_provider = CanonicalStateKeyProvider()

    def test_dag_metrics_match_declared_fixture_counts(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        metrics = dry_run.dag.metrics

        self.assertEqual(metrics.node_count, 118)
        self.assertEqual(metrics.edge_count, 111)
        self.assertEqual(metrics.root_count, 7)
        self.assertEqual(metrics.leaf_count, 12)
        self.assertEqual(metrics.max_out_degree, 6)
        self.assertEqual(metrics.max_in_degree, 1)

    def test_occurrence_dag_preserves_path_distinct_nodes(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        dag = dry_run.dag

        for root_id in dag.root_occurrence_ids:
            self.assertEqual(dag.in_degree(root_id), 0)
            self.assertEqual(dag.out_degree(root_id), 1)

        for leaf_id in dag.leaf_occurrence_ids:
            self.assertEqual(dag.in_degree(leaf_id), 1)
            self.assertEqual(dag.out_degree(leaf_id), 0)

    def test_shared_root_fixture_builds_actual_branch_fan_out(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        dag = dry_run.dag
        italian_games = [
            game for game in dry_run.ingested_corpus.games if game.game_id == "italian-branch-lab"
        ]
        branch_occurrence_ids = {
            game.occurrences[8].occurrence_id for game in italian_games
        }

        self.assertEqual(len(branch_occurrence_ids), 1)
        branch_occurrence_id = next(iter(branch_occurrence_ids))
        self.assertEqual(dag.out_degree(branch_occurrence_id), 6)

    def test_convergence_metrics_respect_repeated_state_surface_without_node_merge(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        dag = dry_run.dag
        relation_surface = dry_run.repeated_state_query_surface
        transposed_state_key = self.state_key_provider.key_for_board(
            board_from_san(TRANSPOSITION_SEQUENCE)
        )
        relation = relation_surface.by_state_key(transposed_state_key)

        self.assertIsNotNone(relation)
        assert relation is not None
        self.assertEqual(dag.metrics.max_state_convergence, 9)
        self.assertEqual(dag.metrics.repeated_state_group_count, 10)
        self.assertEqual(dag.metrics.repeated_state_occurrence_count, 28)
        self.assertEqual(len(relation.occurrences), 2)
        self.assertNotEqual(
            relation.occurrences[0].occurrence_id,
            relation.occurrences[1].occurrence_id,
        )
        self.assertIsNotNone(dag.by_occurrence_id(relation.occurrences[0].occurrence_id))
        self.assertIsNotNone(dag.by_occurrence_id(relation.occurrences[1].occurrence_id))


if __name__ == "__main__":
    unittest.main()