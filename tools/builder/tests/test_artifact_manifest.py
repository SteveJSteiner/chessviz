"""Fixture-backed checks for builder/viewer artifact manifest export."""

from __future__ import annotations

import unittest

from chessviz_builder.artifact_manifest import (
    build_builder_bootstrap_manifest,
    build_viewer_scene_manifest,
)
from chessviz_builder.corpus_ingest import initial_corpus_declaration
from chessviz_builder.pipeline import create_placeholder_pipeline


class ArtifactManifestTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = create_placeholder_pipeline()
        self.dry_run = self.pipeline.dry_run(initial_corpus_declaration())

    def test_builder_bootstrap_manifest_carries_runtime_surfaces(self) -> None:
        manifest = build_builder_bootstrap_manifest(self.dry_run)

        self.assertEqual(
            manifest["graphObjectId"],
            "initial-represented-subset:2026-04-11-fixture-002",
        )
        self.assertEqual(len(manifest["occurrences"]), len(self.dry_run.occurrences))
        self.assertEqual(len(manifest["edges"]), len(self.dry_run.dag.edges))
        self.assertEqual(
            len(manifest["transitions"]),
            len(self.dry_run.ingested_corpus.transitions),
        )
        self.assertEqual(
            len(manifest["departureRules"]),
            len(self.dry_run.departure_rules.records),
        )
        self.assertEqual(
            len(manifest["priorityFrontierOccurrenceIds"]),
            self.dry_run.salience.config.top_k_frontier,
        )

        first_occurrence = manifest["occurrences"][0]

        self.assertIn("salience", first_occurrence)
        self.assertIn("embedding", first_occurrence)
        self.assertIn("phase", first_occurrence)
        self.assertEqual(len(first_occurrence["embedding"]["coordinate"]), 3)

        first_transition = manifest["transitions"][0]
        first_departure_rule = manifest["departureRules"][0]

        self.assertEqual(first_transition["moveFacts"]["san"], "d4")
        self.assertEqual(first_transition["moveFamily"]["interactionClass"], "quiet")
        self.assertEqual(
            first_transition["moveFamily"],
            first_departure_rule["moveFamily"],
        )
        self.assertEqual(first_departure_rule["centerlineProfile"], "quiet-glide")
        self.assertGreater(first_departure_rule["departureStrength"], 0.0)

    def test_viewer_scene_manifest_points_at_runtime_exploration_config(self) -> None:
        scene_manifest = build_viewer_scene_manifest(self.dry_run)

        self.assertEqual(scene_manifest["sceneId"], "runtime-exploration-fixture")
        self.assertEqual(
            scene_manifest["summary"],
            "N10 runtime multiscale carrier refinement over builder-owned transition facts, departure guides, and coarse embedding surfaces.",
        )
        self.assertEqual(
            scene_manifest["runtime"]["graphObjectId"],
            "initial-represented-subset:2026-04-11-fixture-002",
        )
        self.assertEqual(scene_manifest["runtime"]["defaultNeighborhoodRadius"], 1)
        self.assertEqual(scene_manifest["runtime"]["cacheCapacity"], 6)
        self.assertGreaterEqual(
            len(scene_manifest["runtime"]["focusCandidateOccurrenceIds"]),
            len(self.dry_run.dag.root_occurrence_ids),
        )


if __name__ == "__main__":
    unittest.main()