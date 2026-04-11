"""Fixture-backed checks for N06 terminal labels and anchors."""

from __future__ import annotations

import unittest

from chessviz_builder.corpus_ingest import initial_corpus_declaration
from chessviz_builder.pipeline import create_placeholder_pipeline
from chessviz_builder.terminal_labeling import (
    BLACK_WIN_OUTCOME,
    BLACK_WIN_WDL,
    DRAW_OUTCOME,
    DRAW_WDL,
    WHITE_WIN_OUTCOME,
    WHITE_WIN_WDL,
)


class TerminalLabelingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = create_placeholder_pipeline()
        self.declaration = initial_corpus_declaration()

    def test_declared_corpus_exposes_wdl_labels_and_terminal_anchors(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        terminal_labels = dry_run.terminal_labels
        terminal_games = {
            game.game_id: game
            for game in dry_run.ingested_corpus.games
            if game.declared_terminal_outcome is not None
        }
        expected = {
            "scholars-mate-white": (WHITE_WIN_WDL, WHITE_WIN_OUTCOME),
            "fools-mate-black": (BLACK_WIN_WDL, BLACK_WIN_OUTCOME),
            "repetition-draw": (DRAW_WDL, DRAW_OUTCOME),
        }

        self.assertEqual(len(terminal_labels.records), 3)
        self.assertEqual(len(terminal_labels.anchors), 3)
        self.assertEqual(
            set(terminal_labels.wdl_labels),
            {WHITE_WIN_WDL, BLACK_WIN_WDL, DRAW_WDL},
        )
        self.assertEqual(
            set(terminal_labels.outcome_classes),
            {WHITE_WIN_OUTCOME, BLACK_WIN_OUTCOME, DRAW_OUTCOME},
        )

        for game_id, (wdl_label, outcome_class) in expected.items():
            occurrence_id = terminal_games[game_id].final_occurrence.occurrence_id
            label_record = terminal_labels.by_occurrence_id(occurrence_id)

            self.assertIsNotNone(label_record)
            assert label_record is not None
            self.assertEqual(label_record.wdl_label, wdl_label)
            self.assertEqual(label_record.outcome_class, outcome_class)
            self.assertEqual(label_record.anchor_id, f"terminal:{outcome_class}")

            anchor_record = terminal_labels.by_anchor_id(label_record.anchor_id)

            self.assertIsNotNone(anchor_record)
            assert anchor_record is not None
            self.assertEqual(anchor_record.wdl_label, wdl_label)
            self.assertEqual(anchor_record.outcome_class, outcome_class)
            self.assertEqual(anchor_record.occurrence_ids, (occurrence_id,))

    def test_nonterminal_occurrences_remain_absent_from_terminal_surface(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        terminal_labels = dry_run.terminal_labels

        for game in dry_run.ingested_corpus.games:
            if game.declared_terminal_outcome is not None:
                continue

            self.assertIsNone(
                terminal_labels.by_occurrence_id(game.final_occurrence.occurrence_id)
            )


if __name__ == "__main__":
    unittest.main()