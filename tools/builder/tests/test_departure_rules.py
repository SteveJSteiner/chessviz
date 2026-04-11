"""Fixture-backed checks for N09 move-interaction departure rules."""

from __future__ import annotations

import unittest

from chessviz_builder.contracts import CorpusDeclaration, IngestedCorpus
from chessviz_builder.corpus_ingest import DeclaredGameFixture
from chessviz_builder.pipeline import create_placeholder_pipeline
from chessviz_builder.transition_departure import TransitionDepartureRuleBuilder


def _probe_declaration() -> CorpusDeclaration:
    return CorpusDeclaration(
        source_name="n09-probe",
        version="2026-04-11",
        location="inline",
    )


class DepartureRuleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pipeline = create_placeholder_pipeline()
        self.builder = TransitionDepartureRuleBuilder()

    def test_capture_departure_is_stronger_than_matched_quiet_control(self) -> None:
        game = DeclaredGameFixture(
            game_id="capture-quiet-match",
            moves_san=("e4", "e5", "Bc4", "Nc6", "Bb5", "a6", "Bxc6", "dxc6"),
        )
        ingested_game = self.pipeline.corpus_ingestor._ingest_game(game)
        surface = self.builder.build(
            IngestedCorpus(declaration=_probe_declaration(), games=(ingested_game,))
        )

        quiet_transition = next(
            transition
            for transition in ingested_game.transitions
            if transition.move_facts.san == "Bc4"
        )
        capture_transition = next(
            transition
            for transition in ingested_game.transitions
            if transition.move_facts.san == "Bxc6"
        )
        quiet_rule = surface.by_edge(
            quiet_transition.parent_occurrence_id,
            quiet_transition.child_occurrence_id,
        )
        capture_rule = surface.by_edge(
            capture_transition.parent_occurrence_id,
            capture_transition.child_occurrence_id,
        )

        self.assertIsNotNone(quiet_rule)
        self.assertIsNotNone(capture_rule)
        assert quiet_rule is not None
        assert capture_rule is not None

        self.assertEqual(quiet_rule.move_family.interaction_class, "quiet")
        self.assertEqual(capture_rule.move_family.interaction_class, "capture")
        self.assertEqual(quiet_rule.centerline_profile, "quiet-glide")
        self.assertEqual(capture_rule.centerline_profile, "capture-break")
        self.assertGreater(capture_rule.departure_strength, quiet_rule.departure_strength)
        self.assertGreater(capture_rule.curvature, quiet_rule.curvature)

    def test_rule_surface_preserves_castle_and_checkmate_classes(self) -> None:
        castle_game = DeclaredGameFixture(
            game_id="castle-probe",
            moves_san=("e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O"),
        )
        mate_game = DeclaredGameFixture(
            game_id="mate-probe",
            moves_san=("f3", "e5", "g4", "Qh4#"),
        )
        ingested_games = (
            self.pipeline.corpus_ingestor._ingest_game(castle_game),
            self.pipeline.corpus_ingestor._ingest_game(mate_game),
        )
        surface = self.builder.build(
            IngestedCorpus(declaration=_probe_declaration(), games=ingested_games)
        )

        castle_transition = ingested_games[0].transitions[-1]
        mate_transition = ingested_games[1].transitions[-1]
        castle_rule = surface.by_edge(
            castle_transition.parent_occurrence_id,
            castle_transition.child_occurrence_id,
        )
        mate_rule = surface.by_edge(
            mate_transition.parent_occurrence_id,
            mate_transition.child_occurrence_id,
        )

        self.assertIsNotNone(castle_rule)
        self.assertIsNotNone(mate_rule)
        assert castle_rule is not None
        assert mate_rule is not None

        self.assertEqual(castle_rule.move_family.interaction_class, "castle")
        self.assertEqual(castle_rule.centerline_profile, "castle-sweep")
        self.assertEqual(mate_rule.move_family.forcing_class, "checkmate")
        self.assertEqual(mate_rule.centerline_profile, "terminal-snap")
        self.assertGreater(mate_rule.vertical_lift, 0.0)


if __name__ == "__main__":
    unittest.main()