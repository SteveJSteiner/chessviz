"""Builder-owned move-family classification and coarse departure rules."""

from __future__ import annotations

from dataclasses import dataclass

from .contracts import (
    IngestedCorpus,
    MoveFactRecord,
    MoveFamilyClassification,
    OccurrenceTransition,
    TransitionDepartureQuerySurface,
    TransitionDepartureRuleRecord,
)

INTERACTION_STRENGTH = {
    "quiet": 0.26,
    "capture": 0.58,
    "castle": 0.34,
}
FORCING_STRENGTH = {
    "none": 0.0,
    "check": 0.12,
    "checkmate": 0.24,
}
SPECIAL_STRENGTH = {
    "none": 0.0,
    "promotion": 0.1,
    "en-passant": 0.08,
}
PIECE_STRENGTH_BIAS = {
    "pawn": 0.0,
    "knight": 0.02,
    "bishop": 0.03,
    "rook": 0.04,
    "queen": 0.05,
    "king": 0.06,
}
PIECE_LATERAL_BASE = {
    "pawn": 0.06,
    "knight": 0.11,
    "bishop": 0.1,
    "rook": 0.08,
    "queen": 0.13,
    "king": 0.15,
}
INTERACTION_LATERAL_BIAS = {
    "quiet": 0.0,
    "capture": 0.05,
    "castle": 0.07,
}
SPECIAL_LATERAL_BIAS = {
    "none": 0.0,
    "promotion": 0.02,
    "en-passant": 0.01,
}
INTERACTION_LIFT = {
    "quiet": 0.05,
    "capture": 0.16,
    "castle": 0.1,
}
FORCING_LIFT = {
    "none": 0.0,
    "check": 0.06,
    "checkmate": 0.12,
}
SPECIAL_LIFT = {
    "none": 0.0,
    "promotion": 0.08,
    "en-passant": 0.04,
}
INTERACTION_CURVATURE = {
    "quiet": 0.12,
    "capture": 0.3,
    "castle": 0.22,
}
FORCING_CURVATURE = {
    "none": 0.0,
    "check": 0.05,
    "checkmate": 0.1,
}
SPECIAL_CURVATURE = {
    "none": 0.0,
    "promotion": 0.04,
    "en-passant": 0.03,
}
INTERACTION_TWIST = {
    "quiet": 0.03,
    "capture": 0.08,
    "castle": 0.18,
}
FORCING_TWIST = {
    "none": 0.0,
    "check": 0.04,
    "checkmate": 0.07,
}
SPECIAL_TWIST = {
    "none": 0.0,
    "promotion": 0.06,
    "en-passant": 0.02,
}


@dataclass(frozen=True)
class TransitionDepartureRuleBuilder:
    def build(self, ingested_corpus: IngestedCorpus) -> TransitionDepartureQuerySurface:
        return TransitionDepartureQuerySurface.from_records(
            tuple(
                derive_departure_rule(transition)
                for transition in ingested_corpus.transitions
            )
        )


def classify_move_family(move_facts: MoveFactRecord) -> MoveFamilyClassification:
    interaction_class = "quiet"
    if move_facts.is_castle:
        interaction_class = "castle"
    elif move_facts.is_capture:
        interaction_class = "capture"

    forcing_class = "none"
    if move_facts.is_checkmate:
        forcing_class = "checkmate"
    elif move_facts.is_check:
        forcing_class = "check"

    special_class = "none"
    if move_facts.promotion_piece is not None:
        special_class = "promotion"
    elif move_facts.is_en_passant:
        special_class = "en-passant"

    return MoveFamilyClassification(
        interaction_class=interaction_class,
        forcing_class=forcing_class,
        special_class=special_class,
    )


def derive_departure_rule(
    transition: OccurrenceTransition,
) -> TransitionDepartureRuleRecord:
    move_family = classify_move_family(transition.move_facts)
    moving_piece = transition.move_facts.moving_piece

    return TransitionDepartureRuleRecord(
        parent_occurrence_id=transition.parent_occurrence_id,
        child_occurrence_id=transition.child_occurrence_id,
        move_uci=transition.move_uci,
        ply=transition.ply,
        move_family=move_family,
        centerline_profile=_centerline_profile(move_family),
        departure_strength=_rounded(
            INTERACTION_STRENGTH[move_family.interaction_class]
            + FORCING_STRENGTH[move_family.forcing_class]
            + SPECIAL_STRENGTH[move_family.special_class]
            + PIECE_STRENGTH_BIAS.get(moving_piece, 0.0)
        ),
        lateral_offset=_rounded(
            PIECE_LATERAL_BASE.get(moving_piece, 0.08)
            + INTERACTION_LATERAL_BIAS[move_family.interaction_class]
            + SPECIAL_LATERAL_BIAS[move_family.special_class]
        ),
        vertical_lift=_rounded(
            INTERACTION_LIFT[move_family.interaction_class]
            + FORCING_LIFT[move_family.forcing_class]
            + SPECIAL_LIFT[move_family.special_class]
        ),
        curvature=_rounded(
            INTERACTION_CURVATURE[move_family.interaction_class]
            + FORCING_CURVATURE[move_family.forcing_class]
            + SPECIAL_CURVATURE[move_family.special_class]
        ),
        twist=_rounded(
            INTERACTION_TWIST[move_family.interaction_class]
            + FORCING_TWIST[move_family.forcing_class]
            + SPECIAL_TWIST[move_family.special_class]
        ),
    )


def _centerline_profile(move_family: MoveFamilyClassification) -> str:
    if move_family.forcing_class == "checkmate":
        return "terminal-snap"
    if move_family.interaction_class == "castle":
        return "castle-sweep"
    if move_family.interaction_class == "capture":
        return "capture-break"
    if move_family.special_class == "promotion":
        return "promotion-rise"
    if move_family.forcing_class == "check":
        return "forcing-rise"
    return "quiet-glide"


def _rounded(value: float) -> float:
    return round(value, 3)