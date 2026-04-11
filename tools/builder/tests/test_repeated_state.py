"""Fixture-backed checks for the repeated-state query surface."""

from __future__ import annotations

import unittest

import chess

from chessviz_builder.corpus_ingest import initial_corpus_declaration
from chessviz_builder.pipeline import create_placeholder_pipeline
from chessviz_builder.state_key import CanonicalStateKeyProvider


TRANSPOSITION_SEQUENCE = ("d4", "Nf6", "c4", "e6", "Nc3", "Bb4")


def board_from_san(sequence: tuple[str, ...]) -> chess.Board:
    board = chess.Board()
    for move in sequence:
        board.push_san(move)
    return board


class RepeatedStateQuerySurfaceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = create_placeholder_pipeline()
        self.declaration = initial_corpus_declaration()
        self.state_key_provider = CanonicalStateKeyProvider()

    def test_query_surface_distinguishes_repeated_and_singleton_states(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        relation_surface = dry_run.repeated_state_query_surface

        self.assertGreater(len(relation_surface.repeated_relations), 0)
        self.assertGreater(len(relation_surface.singleton_relations), 0)

    def test_known_transposition_state_query_returns_both_occurrences(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        relation_surface = dry_run.repeated_state_query_surface
        transposed_state_key = self.state_key_provider.key_for_board(
            board_from_san(TRANSPOSITION_SEQUENCE)
        )

        relation = relation_surface.by_state_key(transposed_state_key)

        self.assertIsNotNone(relation)
        assert relation is not None
        self.assertTrue(relation.is_repeated)
        self.assertEqual(len(relation.occurrences), 2)
        self.assertEqual(
            {occurrence.path[0] for occurrence in relation.occurrences},
            {"game:qgd-bogo-a", "game:qgd-bogo-b"},
        )

    def test_query_by_occurrence_id_returns_shared_relation(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        relation_surface = dry_run.repeated_state_query_surface
        transposed_state_key = self.state_key_provider.key_for_board(
            board_from_san(TRANSPOSITION_SEQUENCE)
        )
        relation = relation_surface.by_state_key(transposed_state_key)

        self.assertIsNotNone(relation)
        assert relation is not None
        queried_relation = relation_surface.by_occurrence_id(
            relation.occurrences[0].occurrence_id
        )

        self.assertEqual(queried_relation, relation)


if __name__ == "__main__":
    unittest.main()