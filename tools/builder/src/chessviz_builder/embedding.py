"""Deterministic hyperbolic-style coarse embedding for builder artifacts."""

from __future__ import annotations

import math
from hashlib import blake2s

from .contracts import (
    DagArtifact,
    EmbeddingArtifact,
    EmbeddingConfig,
    EmbeddingRecord,
    IngestedCorpus,
    OccurrenceLabelQuerySurface,
    RepeatedStateQuerySurface,
    TerminalLabelQuerySurface,
)
from .labeling import ENDGAME_PHASE, MIDDLEGAME_PHASE, OPENING_PHASE
from .terminal_labeling import BLACK_WIN_OUTCOME, DRAW_OUTCOME, WHITE_WIN_OUTCOME


DEFAULT_EMBEDDING_CONFIG = EmbeddingConfig(
    seed=20260411,
    root_ring_radius=0.08,
    max_radius=0.96,
    radial_scale=5.5,
    move_angle_scale=0.42,
    move_angle_decay=0.72,
    repeated_state_pull=0.35,
    phase_pitch=0.32,
    terminal_pitch=0.58,
)


class HyperbolicStyleEmbeddingBuilderV1:
    def __init__(
        self,
        config: EmbeddingConfig = DEFAULT_EMBEDDING_CONFIG,
    ) -> None:
        self.config = config

    def build(
        self,
        ingested_corpus: IngestedCorpus,
        repeated_state_query_surface: RepeatedStateQuerySurface,
        dag: DagArtifact,
        labels: OccurrenceLabelQuerySurface,
        terminal_labels: TerminalLabelQuerySurface,
    ) -> EmbeddingArtifact:
        root_angles = _root_angles(ingested_corpus, self.config)
        occurrence_to_game = {
            occurrence.occurrence_id: game
            for game in ingested_corpus.games
            for occurrence in game.occurrences
        }
        records = tuple(
            _embedding_record(
                node,
                occurrence_to_game[node.occurrence_id].game_id,
                root_angles[occurrence_to_game[node.occurrence_id].game_id],
                occurrence_to_game[node.occurrence_id],
                repeated_state_query_surface,
                dag,
                labels,
                terminal_labels,
                self.config,
            )
            for node in dag.nodes
        )
        return EmbeddingArtifact(
            dag=dag,
            config=self.config,
            records=records,
            coordinates={
                record.occurrence_id: record.coordinate for record in records
            },
            _records_by_occurrence_id={
                record.occurrence_id: record for record in records
            },
        )


def _embedding_record(
    node,
    game_id: str,
    root_angle: float,
    game,
    repeated_state_query_surface: RepeatedStateQuerySurface,
    dag: DagArtifact,
    labels: OccurrenceLabelQuerySurface,
    terminal_labels: TerminalLabelQuerySurface,
    config: EmbeddingConfig,
) -> EmbeddingRecord:
    label_record = labels.by_occurrence_id(node.occurrence_id)
    terminal_record = terminal_labels.by_occurrence_id(node.occurrence_id)
    phase = label_record.phase if label_record is not None else OPENING_PHASE
    relation = repeated_state_query_surface.by_occurrence_id(node.occurrence_id)
    azimuth = _azimuth(node, root_angle, relation, dag, config)
    elevation = _elevation(node.ply, phase, game, config)
    ball_radius = _ball_radius(node.ply, config)

    return EmbeddingRecord(
        occurrence_id=node.occurrence_id,
        coordinate=_spherical_to_cartesian(ball_radius, azimuth, elevation),
        ball_radius=ball_radius,
        azimuth=azimuth,
        elevation=elevation,
        root_game_id=game_id,
        terminal_anchor_id=(terminal_record.anchor_id if terminal_record else None),
    )


def _root_angles(
    ingested_corpus: IngestedCorpus,
    config: EmbeddingConfig,
) -> dict[str, float]:
    ordered_game_ids = tuple(sorted({game.game_id for game in ingested_corpus.games}))
    game_count = len(ordered_game_ids)
    denominator = game_count if game_count else 1
    angles: dict[str, float] = {}

    for index, game_id in enumerate(ordered_game_ids):
        evenly_spaced_angle = (2.0 * math.pi * index) / denominator
        jitter = 0.15 * _signed_unit_interval(config.seed, f"root:{game_id}")
        angles[game_id] = evenly_spaced_angle + jitter

    return angles


def _azimuth(
    node,
    root_angle: float,
    relation,
    dag: DagArtifact,
    config: EmbeddingConfig,
) -> float:
    path_angle = root_angle

    for depth, _ in enumerate(node.path[1:], start=1):
        path_prefix = "/".join(node.path[: depth + 1])
        path_angle += (
            config.move_angle_scale
            * (config.move_angle_decay ** (depth - 1))
            * _signed_unit_interval(config.seed, f"path:{path_prefix}")
        )

    if relation is None or not relation.is_repeated:
        return _normalize_angle(path_angle)

    convergence_span = max(dag.metrics.max_state_convergence - 1, 1)
    relation_strength = config.repeated_state_pull * (
        (len(relation.occurrences) - 1) / convergence_span
    )
    relation_angle = 2.0 * math.pi * _unit_interval(
        config.seed,
        f"relation:{relation.state_key}",
    )
    return _blend_angles(path_angle, relation_angle, relation_strength)


def _elevation(node_ply: int, phase: str, game, config: EmbeddingConfig) -> float:
    phase_pitch = {
        OPENING_PHASE: config.phase_pitch,
        MIDDLEGAME_PHASE: 0.0,
        ENDGAME_PHASE: -config.phase_pitch,
    }.get(phase, 0.0)

    if game.declared_terminal_outcome is None or not game.transitions:
        return phase_pitch

    terminal_progress = node_ply / len(game.transitions)
    terminal_pitch = {
        WHITE_WIN_OUTCOME: config.terminal_pitch,
        DRAW_OUTCOME: 0.0,
        BLACK_WIN_OUTCOME: -config.terminal_pitch,
    }[game.declared_terminal_outcome]
    return max(
        -1.2,
        min(1.2, phase_pitch + terminal_progress * terminal_pitch),
    )


def _ball_radius(node_ply: int, config: EmbeddingConfig) -> float:
    return config.root_ring_radius + (
        (config.max_radius - config.root_ring_radius)
        * math.tanh(node_ply / config.radial_scale)
    )


def _spherical_to_cartesian(
    radius: float,
    azimuth: float,
    elevation: float,
) -> tuple[float, float, float]:
    planar_radius = radius * math.cos(elevation)
    x = planar_radius * math.cos(azimuth)
    y = planar_radius * math.sin(azimuth)
    z = radius * math.sin(elevation)
    return (round(x, 12), round(y, 12), round(z, 12))


def _blend_angles(primary_angle: float, target_angle: float, pull: float) -> float:
    clamped_pull = max(0.0, min(1.0, pull))
    blended_x = ((1.0 - clamped_pull) * math.cos(primary_angle)) + (
        clamped_pull * math.cos(target_angle)
    )
    blended_y = ((1.0 - clamped_pull) * math.sin(primary_angle)) + (
        clamped_pull * math.sin(target_angle)
    )
    return math.atan2(blended_y, blended_x)


def _normalize_angle(angle: float) -> float:
    return math.atan2(math.sin(angle), math.cos(angle))


def _signed_unit_interval(seed: int, key: str) -> float:
    return (2.0 * _unit_interval(seed, key)) - 1.0


def _unit_interval(seed: int, key: str) -> float:
    digest = blake2s(f"{seed}:{key}".encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(digest, byteorder="big") / float(2**64 - 1)