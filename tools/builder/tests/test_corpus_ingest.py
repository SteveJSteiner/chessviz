"""Fixture-backed checks for declared corpus ingestion."""

from __future__ import annotations

import unittest

import chess

from chessviz_builder.corpus_ingest import (
    initial_corpus_declaration,
    load_declared_corpus_fixture,
)
from chessviz_builder.pipeline import create_placeholder_pipeline
from chessviz_builder.state_key import CanonicalStateKeyProvider


class CorpusIngestTests(unittest.TestCase):
    def setUp(self) -> None:
        self.declaration = initial_corpus_declaration()
        self.pipeline = create_placeholder_pipeline()
        self.state_key_provider = CanonicalStateKeyProvider()

    def test_declared_fixture_matches_declaration(self) -> None:
        fixture = load_declared_corpus_fixture(declaration=self.declaration)

        self.assertEqual(fixture.declaration, self.declaration)
        self.assertEqual(len(fixture.games), 12)
        self.assertEqual(
            {
                game.game_id: game.terminal_outcome
                for game in fixture.games
                if game.terminal_outcome is not None
            },
            {
                "scholars-mate-white": "white-win",
                "fools-mate-black": "black-win",
                "repetition-draw": "draw",
            },
        )

    def test_ingestion_produces_continuous_paths_rooted_at_initial_position(self) -> None:
        ingested_corpus = self.pipeline.corpus_ingestor.ingest(self.declaration)
        start_state_key = self.state_key_provider.key_for_board(chess.Board())

        for game in ingested_corpus.games:
            self.assertEqual(game.occurrences[0].state_key, start_state_key)
            self.assertEqual(game.occurrences[0].ply, 0)
            self.assertEqual(len(game.occurrences), len(game.transitions) + 1)

            for index, transition in enumerate(game.transitions):
                parent = game.occurrences[index]
                child = game.occurrences[index + 1]
                self.assertEqual(transition.parent_occurrence_id, parent.occurrence_id)
                self.assertEqual(transition.child_occurrence_id, child.occurrence_id)
                self.assertEqual(transition.ply, index + 1)
                self.assertEqual(child.ply, transition.ply)
                self.assertEqual(child.ply, parent.ply + 1)
                self.assertEqual(child.path[:-1], parent.path)
                self.assertEqual(len(child.path), len(parent.path) + 1)

    def test_small_corpus_fixture_has_expected_occurrence_counts(self) -> None:
        ingested_corpus = self.pipeline.corpus_ingestor.ingest(self.declaration)

        self.assertEqual(len(ingested_corpus.games), 12)
        self.assertEqual(len(ingested_corpus.occurrences), 118)
        self.assertEqual(len(ingested_corpus.transitions), 111)
        self.assertEqual(
            [(game.game_id, len(game.occurrences)) for game in ingested_corpus.games],
            [
                ("qgd-bogo-a", 7),
                ("qgd-bogo-b", 7),
                ("scholars-mate-white", 8),
                ("fools-mate-black", 5),
                ("repetition-draw", 9),
                ("italian-branch-lab", 14),
                ("italian-branch-lab", 14),
                ("italian-branch-lab", 14),
                ("italian-branch-lab", 14),
                ("italian-branch-lab", 14),
                ("italian-branch-lab", 14),
                ("endgame-simplification-lab", 43),
            ],
        )
        self.assertEqual(
            {
                game.game_id: game.declared_terminal_outcome
                for game in ingested_corpus.games
                if game.declared_terminal_outcome is not None
            },
            {
                "scholars-mate-white": "white-win",
                "fools-mate-black": "black-win",
                "repetition-draw": "draw",
            },
        )
        self.assertEqual(
            len(
                {
                    game.occurrences[8].occurrence_id
                    for game in ingested_corpus.games
                    if game.game_id == "italian-branch-lab"
                }
            ),
            1,
        )


if __name__ == "__main__":
    unittest.main()