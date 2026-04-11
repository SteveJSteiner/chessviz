"""Fixture-backed checks for the N02a identity layer."""

from __future__ import annotations

import unittest

import chess

from chessviz_builder.corpus_ingest import initial_corpus_declaration
from chessviz_builder.occurrence_identity import StableOccurrenceIdentity
from chessviz_builder.pipeline import create_placeholder_pipeline
from chessviz_builder.state_key import CanonicalStateKeyProvider


TRANSPOSITION_SEQUENCE_A = ("d4", "Nf6", "c4", "e6", "Nc3", "Bb4")
TRANSPOSITION_SEQUENCE_B = ("d4", "e6", "c4", "Nf6", "Nc3", "Bb4")


def board_from_san(sequence: tuple[str, ...]) -> chess.Board:
    board = chess.Board()
    for move in sequence:
        board.push_san(move)
    return board


class IdentityLayerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.state_key_provider = CanonicalStateKeyProvider()
        self.identity_provider = StableOccurrenceIdentity()

    def test_repeated_construction_produces_same_state_key(self) -> None:
        board_a = board_from_san(TRANSPOSITION_SEQUENCE_A)
        board_b = board_from_san(TRANSPOSITION_SEQUENCE_A)

        self.assertEqual(
            self.state_key_provider.key_for_board(board_a),
            self.state_key_provider.key_for_board(board_b),
        )

    def test_transposition_shares_state_key_but_not_occurrence_identity(self) -> None:
        board_a = board_from_san(TRANSPOSITION_SEQUENCE_A)
        board_b = board_from_san(TRANSPOSITION_SEQUENCE_B)
        key_a = self.state_key_provider.key_for_board(board_a)
        key_b = self.state_key_provider.key_for_board(board_b)
        occurrence_a = self.identity_provider.identify(key_a, TRANSPOSITION_SEQUENCE_A)
        occurrence_b = self.identity_provider.identify(key_b, TRANSPOSITION_SEQUENCE_B)

        self.assertNotEqual(board_a.fen(), board_b.fen())
        self.assertEqual(key_a, key_b)
        self.assertEqual(occurrence_a.state_key, occurrence_b.state_key)
        self.assertNotEqual(occurrence_a.occurrence_id, occurrence_b.occurrence_id)

    def test_pipeline_exposes_identity_contract_to_ingestor(self) -> None:
        pipeline = create_placeholder_pipeline()
        dry_run = pipeline.dry_run(initial_corpus_declaration())

        self.assertIs(pipeline.corpus_ingestor.state_key_provider, pipeline.state_key_provider)
        self.assertEqual(
            dry_run.occurrences[0].state_key,
            pipeline.state_key_provider.key_for_board(chess.Board()),
        )
        self.assertEqual(dry_run.occurrences[0].ply, 0)


if __name__ == "__main__":
    unittest.main()