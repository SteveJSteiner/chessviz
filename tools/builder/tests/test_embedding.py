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
        terminal_leaf_records = {
            game.declared_terminal_outcome: embedding.by_occurrence_id(
                game.final_occurrence.occurrence_id
            )
            for game in dry_run.ingested_corpus.games
            if game.declared_terminal_outcome is not None
        }
        white_win_leaf = terminal_leaf_records.get("white-win")
        draw_leaf = terminal_leaf_records.get("draw")
        black_win_leaf = terminal_leaf_records.get("black-win")
        leaf_occurrence_ids = {
            game.final_occurrence.occurrence_id for game in dry_run.ingested_corpus.games
        }
        repeated_leaf_relation = next(
            (
                relation
                for relation in dry_run.repeated_state_query_surface.repeated_relations
                if len(relation.occurrence_ids) == 2
                and set(relation.occurrence_ids).issubset(leaf_occurrence_ids)
            ),
            None,
        )

        self.assertIsNotNone(white_win_leaf)
        self.assertIsNotNone(draw_leaf)
        self.assertIsNotNone(black_win_leaf)
        self.assertIsNotNone(repeated_leaf_relation)
        assert white_win_leaf is not None
        assert draw_leaf is not None
        assert black_win_leaf is not None
        assert repeated_leaf_relation is not None
        transposed_leaf_records = [
            embedding.by_occurrence_id(occurrence_id)
            for occurrence_id in repeated_leaf_relation.occurrence_ids
        ]

        self.assertTrue(all(record is not None for record in transposed_leaf_records))
        first_transposed_leaf, second_transposed_leaf = transposed_leaf_records
        assert first_transposed_leaf is not None
        assert second_transposed_leaf is not None

        self.assertGreater(
            white_win_leaf.coordinate[2],
            draw_leaf.coordinate[2],
        )
        self.assertGreater(
            draw_leaf.coordinate[2],
            black_win_leaf.coordinate[2],
        )
        self.assertNotEqual(
            first_transposed_leaf.coordinate,
            second_transposed_leaf.coordinate,
        )
        self.assertAlmostEqual(
            first_transposed_leaf.ball_radius,
            second_transposed_leaf.ball_radius,
            places=12,
        )


if __name__ == "__main__":
    unittest.main()