"""Fixture-backed checks for N07 salience normalization and priority hints."""

from __future__ import annotations

import unittest

from chessviz_builder.corpus_ingest import initial_corpus_declaration
from chessviz_builder.salience import (
    CLOSE_ZOOM,
    COARSE_ZOOM,
    DEFAULT_SALIENCE_CONFIG,
    DETAIL_PRIORITY,
    FOREGROUND_PRIORITY,
)
from chessviz_builder.pipeline import create_placeholder_pipeline


class SalienceSurfaceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = create_placeholder_pipeline()
        self.declaration = initial_corpus_declaration()

    def test_salience_surface_normalizes_scores_and_exposes_priority_frontier(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        salience = dry_run.salience

        self.assertEqual(len(salience.records), len(dry_run.occurrences))
        self.assertEqual(salience.config, DEFAULT_SALIENCE_CONFIG)
        self.assertEqual(len(salience.priority_frontier), salience.config.top_k_frontier)
        self.assertEqual(salience.records[0].priority_hint.priority_rank, 1)
        self.assertEqual(salience.records[-1].priority_hint.priority_rank, len(salience))
        self.assertEqual(salience.records[0].normalized_score, 1.0)
        self.assertEqual(salience.records[-1].priority_hint.priority_band, DETAIL_PRIORITY)
        self.assertEqual(salience.records[-1].priority_hint.retain_from_zoom, CLOSE_ZOOM)

        for record in salience.records:
            self.assertGreaterEqual(record.normalized_score, 0.0)
            self.assertLessEqual(record.normalized_score, 1.0)

    def test_terminal_leaf_occurrences_receive_foreground_priority_hints(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        salience = dry_run.salience

        for game in dry_run.ingested_corpus.games:
            root_record = salience.by_occurrence_id(game.occurrences[0].occurrence_id)
            leaf_record = salience.by_occurrence_id(game.final_occurrence.occurrence_id)

            self.assertIsNotNone(root_record)
            self.assertIsNotNone(leaf_record)
            assert root_record is not None
            assert leaf_record is not None

            if game.declared_terminal_outcome is None:
                continue

            self.assertGreater(leaf_record.normalized_score, root_record.normalized_score)
            self.assertEqual(leaf_record.priority_hint.priority_band, FOREGROUND_PRIORITY)
            self.assertEqual(leaf_record.priority_hint.retain_from_zoom, COARSE_ZOOM)

    def test_shared_states_receive_stronger_frequency_signal_than_singletons(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        salience = dry_run.salience
        qgd_leaf = next(
            game.final_occurrence
            for game in dry_run.ingested_corpus.games
            if game.game_id == "qgd-bogo-a"
        )
        scholars_leaf = next(
            game.final_occurrence
            for game in dry_run.ingested_corpus.games
            if game.game_id == "scholars-mate-white"
        )
        qgd_record = salience.by_occurrence_id(qgd_leaf.occurrence_id)
        scholars_record = salience.by_occurrence_id(scholars_leaf.occurrence_id)

        self.assertIsNotNone(qgd_record)
        self.assertIsNotNone(scholars_record)
        assert qgd_record is not None
        assert scholars_record is not None
        self.assertGreater(qgd_record.frequency_signal, scholars_record.frequency_signal)


if __name__ == "__main__":
    unittest.main()