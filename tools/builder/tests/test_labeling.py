"""Fixture-backed checks for N05 occurrence phase/material labels."""

from __future__ import annotations

from dataclasses import replace
import unittest

from chessviz_builder.contracts import IngestedCorpus
from chessviz_builder.corpus_ingest import (
    DeclaredGameFixture,
    initial_corpus_declaration,
)
from chessviz_builder.labeling import (
    ENDGAME_PHASE,
    FULL_MATERIAL_SIGNATURE,
    MIDDLEGAME_PHASE,
    OPENING_PHASE,
    _classify_phase,
)
from chessviz_builder.pipeline import create_placeholder_pipeline


class OccurrenceLabelingTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = create_placeholder_pipeline()
        self.declaration = initial_corpus_declaration()

    def test_qgd_transposition_leaves_keep_middlegame_labels(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        labels = dry_run.labels
        qgd_games = tuple(
            game
            for game in dry_run.ingested_corpus.games
            if game.game_id.startswith("qgd-bogo-")
        )

        self.assertEqual(
            set(labels.phases),
            {OPENING_PHASE, MIDDLEGAME_PHASE, ENDGAME_PHASE},
        )

        for game in qgd_games:
            label_record = labels.by_occurrence_id(game.final_occurrence.occurrence_id)

            self.assertIsNotNone(label_record)
            assert label_record is not None
            self.assertEqual(label_record.phase, MIDDLEGAME_PHASE)
            self.assertEqual(label_record.material_signature, FULL_MATERIAL_SIGNATURE)

    def test_declared_corpus_root_occurrences_keep_full_material_opening_labels(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        labels = dry_run.labels

        for root_occurrence_id in dry_run.dag.root_occurrence_ids:
            label_record = labels.by_occurrence_id(root_occurrence_id)

            self.assertIsNotNone(label_record)
            assert label_record is not None
            self.assertEqual(label_record.phase, OPENING_PHASE)
            self.assertEqual(label_record.material_signature, FULL_MATERIAL_SIGNATURE)

        self.assertIn(FULL_MATERIAL_SIGNATURE, labels.material_signatures)
        self.assertGreater(len(labels.material_signatures), 1)

    def test_material_signature_changes_after_capture_without_altering_query_surface(
        self,
    ) -> None:
        capture_signature_probe_fixture = DeclaredGameFixture(
            "probe-capture-signature",
            ("e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6", "dxc6"),
        )
        ingested_fixture = self.pipeline.corpus_ingestor._ingest_game(
            capture_signature_probe_fixture
        )
        ingested_corpus = IngestedCorpus(
            declaration=self.declaration,
            games=(ingested_fixture,),
        )
        repeated_state_query_surface = self.pipeline.repeated_state_query_builder.build(
            ingested_corpus
        )
        dag = self.pipeline.dag_builder.build(
            self.declaration,
            ingested_corpus,
            repeated_state_query_surface,
        )
        labels = self.pipeline.labeler.label(dag)

        final_label = labels.by_occurrence_id(
            ingested_fixture.occurrences[-1].occurrence_id
        )

        self.assertIsNotNone(final_label)
        assert final_label is not None
        self.assertEqual(
            final_label.material_signature,
            "white[Q1,R2,B1,N2,P8]|black[Q1,R2,B2,N1,P8]",
        )
        self.assertEqual(
            len(
                labels.for_phase_and_material_signature(
                    final_label.phase,
                    final_label.material_signature,
                )
            ),
            1,
        )

    def test_phase_classifier_uses_explicit_ply_not_path_length(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        qgd_leaf = next(
            game.final_occurrence
            for game in dry_run.ingested_corpus.games
            if game.game_id == "qgd-bogo-a"
        )
        synthetic_path_leaf = replace(
            qgd_leaf,
            path=(
                "synthetic-anchor",
                "synthetic-branch",
                *qgd_leaf.path,
            ),
        )

        self.assertEqual(qgd_leaf.ply, synthetic_path_leaf.ply)
        self.assertNotEqual(len(qgd_leaf.path), len(synthetic_path_leaf.path))
        self.assertEqual(_classify_phase(qgd_leaf), MIDDLEGAME_PHASE)
        self.assertEqual(_classify_phase(synthetic_path_leaf), MIDDLEGAME_PHASE)

    def test_endgame_fixture_produces_multiple_endgame_occurrences(self) -> None:
        dry_run = self.pipeline.dry_run(self.declaration)
        labels = dry_run.labels
        endgame_game = next(
            game
            for game in dry_run.ingested_corpus.games
            if game.game_id == "endgame-simplification-lab"
        )

        self.assertGreaterEqual(
            sum(
                1
                for occurrence in endgame_game.occurrences
                if labels.by_occurrence_id(occurrence.occurrence_id).phase
                == ENDGAME_PHASE
            ),
            4,
        )

        final_label = labels.by_occurrence_id(endgame_game.final_occurrence.occurrence_id)

        self.assertIsNotNone(final_label)
        assert final_label is not None
        self.assertEqual(final_label.phase, ENDGAME_PHASE)


if __name__ == "__main__":
    unittest.main()