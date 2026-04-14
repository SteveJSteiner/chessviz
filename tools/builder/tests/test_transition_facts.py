"""Fixture-backed checks for canonical move facts on transitions."""

from __future__ import annotations

import unittest

from chessviz_builder.corpus_ingest import DeclaredGameFixture, initial_corpus_declaration
from chessviz_builder.pipeline import create_placeholder_pipeline


class TransitionFactTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = create_placeholder_pipeline()

    def test_declared_corpus_transitions_include_basic_move_facts(self) -> None:
        ingested_corpus = self.pipeline.corpus_ingestor.ingest(initial_corpus_declaration())
        first_transition = ingested_corpus.games[0].transitions[0]

        self.assertEqual(first_transition.move_facts.san, "d4")
        self.assertEqual(first_transition.move_facts.moving_piece, "pawn")
        self.assertIsNone(first_transition.move_facts.captured_piece)
        self.assertFalse(first_transition.move_facts.is_capture)
        self.assertFalse(first_transition.move_facts.is_castle)
        self.assertFalse(first_transition.move_facts.is_check)
        self.assertFalse(first_transition.move_facts.is_checkmate)

    def test_capture_and_castle_facts_are_available_without_reclassification(self) -> None:
        capture_castle_probe_fixture = DeclaredGameFixture(
            "probe-capture-castle",
            ("e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6", "dxc6", "O-O"),
        )
        ingested_fixture = self.pipeline.corpus_ingestor._ingest_game(
            capture_castle_probe_fixture
        )

        capture_transition = ingested_fixture.transitions[6]
        castle_transition = ingested_fixture.transitions[8]

        self.assertTrue(capture_transition.move_facts.is_capture)
        self.assertEqual(capture_transition.move_facts.moving_piece, "bishop")
        self.assertEqual(capture_transition.move_facts.captured_piece, "knight")
        self.assertFalse(capture_transition.move_facts.is_castle)

        self.assertTrue(castle_transition.move_facts.is_castle)
        self.assertEqual(castle_transition.move_facts.castle_side, "kingside")
        self.assertEqual(castle_transition.move_facts.moving_piece, "king")
        self.assertFalse(castle_transition.move_facts.is_capture)

    def test_checkmate_fact_is_available_on_transition(self) -> None:
        checkmate_probe_fixture = DeclaredGameFixture(
            "probe-checkmate",
            ("f3", "e5", "g4", "Qh4#"),
        )
        ingested_fixture = self.pipeline.corpus_ingestor._ingest_game(
            checkmate_probe_fixture
        )
        mate_transition = ingested_fixture.transitions[-1]

        self.assertTrue(mate_transition.move_facts.is_check)
        self.assertTrue(mate_transition.move_facts.is_checkmate)
        self.assertEqual(mate_transition.move_facts.moving_piece, "queen")
        self.assertEqual(mate_transition.move_facts.san, "Qh4#")


if __name__ == "__main__":
    unittest.main()