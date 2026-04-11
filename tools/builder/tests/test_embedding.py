"""Fixture-backed checks for N08 coarse embedding determinism and structure."""

from __future__ import annotations

import math
import unittest

from chessviz_builder.corpus_ingest import initial_corpus_declaration
from chessviz_builder.pipeline import create_placeholder_pipeline


class EmbeddingArtifactTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = create_placeholder_pipeline()
        self.declaration = initial_corpus_declaration()

    def test_embedding_is_deterministic_for_fixed_declaration_and_config(self) -> None:
        first_dry_run = self.pipeline.dry_run(self.declaration)
        second_dry_run = self.pipeline.dry_run(self.declaration)

        self.assertEqual(first_dry_run.embedding.config, second_dry_run.embedding.config)
        self.assertEqual(first_dry_run.embedding.coordinates, second_dry_run.embedding.coordinates)
        self.assertEqual(len(first_dry_run.embedding), len(first_dry_run.occurrences))

    def test_embedding_coordinates_stay_inside_ball_and_expand_with_depth(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        embedding = dry_run.embedding

        for game in dry_run.ingested_corpus.games:
            radial_distances = []

            for occurrence in game.occurrences:
                record = embedding.by_occurrence_id(occurrence.occurrence_id)

                self.assertIsNotNone(record)
                assert record is not None
                coordinate_radius = math.dist((0.0, 0.0, 0.0), record.coordinate)
                self.assertLess(coordinate_radius, 1.0)
                self.assertAlmostEqual(coordinate_radius, record.ball_radius, places=9)
                radial_distances.append(record.ball_radius)

            self.assertEqual(radial_distances, sorted(radial_distances))
            self.assertLess(radial_distances[0], radial_distances[-1])

    def test_embedding_separates_terminal_outcomes_and_preserves_transposition_distinction(
        self,
    ) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        embedding = dry_run.embedding
        leaf_records = {
            game.game_id: embedding.by_occurrence_id(game.final_occurrence.occurrence_id)
            for game in dry_run.ingested_corpus.games
        }

        self.assertIsNotNone(leaf_records["scholars-mate-white"])
        self.assertIsNotNone(leaf_records["repetition-draw"])
        self.assertIsNotNone(leaf_records["fools-mate-black"])
        self.assertIsNotNone(leaf_records["qgd-bogo-a"])
        self.assertIsNotNone(leaf_records["qgd-bogo-b"])
        assert leaf_records["scholars-mate-white"] is not None
        assert leaf_records["repetition-draw"] is not None
        assert leaf_records["fools-mate-black"] is not None
        assert leaf_records["qgd-bogo-a"] is not None
        assert leaf_records["qgd-bogo-b"] is not None

        self.assertGreater(
            leaf_records["scholars-mate-white"].coordinate[2],
            leaf_records["repetition-draw"].coordinate[2],
        )
        self.assertGreater(
            leaf_records["repetition-draw"].coordinate[2],
            leaf_records["fools-mate-black"].coordinate[2],
        )
        self.assertNotEqual(
            leaf_records["qgd-bogo-a"].coordinate,
            leaf_records["qgd-bogo-b"].coordinate,
        )
        self.assertAlmostEqual(
            leaf_records["qgd-bogo-a"].ball_radius,
            leaf_records["qgd-bogo-b"].ball_radius,
            places=12,
        )


if __name__ == "__main__":
    unittest.main()