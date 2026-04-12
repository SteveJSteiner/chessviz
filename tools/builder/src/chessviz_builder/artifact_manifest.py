"""Builder-owned manifest export for viewer runtime exploration."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .contracts import BuilderWorkspace
from .pipeline import PipelineDryRun

DEFAULT_SCENE_ID = "runtime-exploration-fixture"


def build_builder_bootstrap_manifest(dry_run: PipelineDryRun) -> dict[str, Any]:
    graph_object_id = _graph_object_id(dry_run)
    departure_rule_by_edge = {
        (rule.parent_occurrence_id, rule.child_occurrence_id): rule
        for rule in dry_run.departure_rules.records
    }

    return {
        "graphObjectId": graph_object_id,
        "sourceName": dry_run.ingested_corpus.declaration.source_name,
        "version": dry_run.ingested_corpus.declaration.version,
        "rootOccurrenceIds": list(dry_run.dag.root_occurrence_ids),
        "leafOccurrenceIds": list(dry_run.dag.leaf_occurrence_ids),
        "priorityFrontierOccurrenceIds": [
            record.occurrence_id for record in dry_run.salience.priority_frontier
        ],
        "occurrences": [
            {
                "occurrenceId": occurrence.occurrence_id,
                "stateKey": occurrence.state_key,
                "path": list(occurrence.path),
                "ply": occurrence.ply,
                "phase": label_record.phase,
                "materialSignature": label_record.material_signature,
                "salience": {
                    "rawScore": salience_record.raw_score,
                    "normalizedScore": salience_record.normalized_score,
                    "frequencySignal": salience_record.frequency_signal,
                    "terminalPullSignal": salience_record.terminal_pull_signal,
                    "centralitySignal": salience_record.centrality_signal,
                    "priorityHint": {
                        "priorityRank": salience_record.priority_hint.priority_rank,
                        "priorityBand": salience_record.priority_hint.priority_band,
                        "retainFromZoom": salience_record.priority_hint.retain_from_zoom,
                    },
                },
                "terminal": (
                    {
                        "wdlLabel": terminal_record.wdl_label,
                        "outcomeClass": terminal_record.outcome_class,
                        "anchorId": terminal_record.anchor_id,
                    }
                    if terminal_record is not None
                    else None
                ),
                "embedding": {
                    "coordinate": list(embedding_record.coordinate),
                    "ballRadius": embedding_record.ball_radius,
                    "azimuth": embedding_record.azimuth,
                    "elevation": embedding_record.elevation,
                    "rootGameId": embedding_record.root_game_id,
                    "terminalAnchorId": embedding_record.terminal_anchor_id,
                },
            }
            for occurrence in dry_run.occurrences
            for label_record in [dry_run.labels.by_occurrence_id(occurrence.occurrence_id)]
            for salience_record in [
                dry_run.salience.by_occurrence_id(occurrence.occurrence_id)
            ]
            for terminal_record in [
                dry_run.terminal_labels.by_occurrence_id(occurrence.occurrence_id)
            ]
            for embedding_record in [
                dry_run.embedding.by_occurrence_id(occurrence.occurrence_id)
            ]
            if label_record is not None
            and salience_record is not None
            and embedding_record is not None
        ],
        "edges": [
            {
                "sourceOccurrenceId": source_occurrence_id,
                "targetOccurrenceId": target_occurrence_id,
            }
            for source_occurrence_id, target_occurrence_id in dry_run.dag.edges
        ],
        "transitions": [
            {
                "sourceOccurrenceId": transition.parent_occurrence_id,
                "targetOccurrenceId": transition.child_occurrence_id,
                "moveUci": transition.move_uci,
                "ply": transition.ply,
                "moveFacts": {
                    "san": transition.move_facts.san,
                    "movingPiece": transition.move_facts.moving_piece,
                    "capturedPiece": transition.move_facts.captured_piece,
                    "promotionPiece": transition.move_facts.promotion_piece,
                    "isCapture": transition.move_facts.is_capture,
                    "isCheck": transition.move_facts.is_check,
                    "isCheckmate": transition.move_facts.is_checkmate,
                    "isCastle": transition.move_facts.is_castle,
                    "castleSide": transition.move_facts.castle_side,
                    "isEnPassant": transition.move_facts.is_en_passant,
                },
                "moveFamily": _move_family_payload(
                    departure_rule_by_edge[
                        (
                            transition.parent_occurrence_id,
                            transition.child_occurrence_id,
                        )
                    ].move_family
                ),
            }
            for transition in dry_run.ingested_corpus.transitions
        ],
        "departureRules": [
            {
                "sourceOccurrenceId": rule.parent_occurrence_id,
                "targetOccurrenceId": rule.child_occurrence_id,
                "moveUci": rule.move_uci,
                "ply": rule.ply,
                "moveFamily": _move_family_payload(rule.move_family),
                "centerlineProfile": rule.centerline_profile,
                "departureStrength": rule.departure_strength,
                "lateralOffset": rule.lateral_offset,
                "verticalLift": rule.vertical_lift,
                "curvature": rule.curvature,
                "twist": rule.twist,
            }
            for rule in dry_run.departure_rules.records
        ],
        "repeatedStateRelations": [
            {
                "stateKey": relation.state_key,
                "occurrenceIds": list(relation.occurrence_ids),
            }
            for relation in dry_run.repeated_state_query_surface.relations
        ],
        "terminalAnchors": [
            {
                "anchorId": anchor.anchor_id,
                "wdlLabel": anchor.wdl_label,
                "outcomeClass": anchor.outcome_class,
                "occurrenceIds": list(anchor.occurrence_ids),
            }
            for anchor in dry_run.terminal_labels.anchors
        ],
        "salienceConfig": {
            "frequencyWeight": dry_run.salience.config.frequency_weight,
            "terminalPullWeight": dry_run.salience.config.terminal_pull_weight,
            "centralityWeight": dry_run.salience.config.centrality_weight,
            "normalization": dry_run.salience.config.normalization,
            "topKFrontier": dry_run.salience.config.top_k_frontier,
        },
        "embeddingConfig": {
            "seed": dry_run.embedding.config.seed,
            "rootRingRadius": dry_run.embedding.config.root_ring_radius,
            "maxRadius": dry_run.embedding.config.max_radius,
            "radialScale": dry_run.embedding.config.radial_scale,
            "moveAngleScale": dry_run.embedding.config.move_angle_scale,
            "moveAngleDecay": dry_run.embedding.config.move_angle_decay,
            "repeatedStatePull": dry_run.embedding.config.repeated_state_pull,
            "phasePitch": dry_run.embedding.config.phase_pitch,
            "terminalPitch": dry_run.embedding.config.terminal_pitch,
        },
    }


def build_viewer_scene_manifest(dry_run: PipelineDryRun) -> dict[str, Any]:
    graph_object_id = _graph_object_id(dry_run)
    initial_focus_occurrence_id = _initial_focus_occurrence_id(dry_run)
    focus_candidate_occurrence_ids = _focus_candidate_occurrence_ids(dry_run)

    return {
        "sceneId": DEFAULT_SCENE_ID,
        "title": "Runtime Exploration Fixture",
        "summary": "N10 runtime multiscale carrier refinement over builder-owned transition facts, departure guides, and coarse embedding surfaces.",
        "accentColor": "#0f766e",
        "camera": {
            "position": [0.0, 0.45, 4.2],
            "lookAt": [0.0, 0.0, 0.0],
            "fov": 48,
        },
        "runtime": {
            "graphObjectId": graph_object_id,
            "initialFocusOccurrenceId": initial_focus_occurrence_id,
            "focusCandidateOccurrenceIds": focus_candidate_occurrence_ids,
            "defaultNeighborhoodRadius": 2,
            "maxNeighborhoodRadius": 4,
            "defaultRefinementBudget": 8,
            "maxRefinementBudget": 12,
            "cacheCapacity": 6,
        },
    }


def write_fixture_artifacts(
    workspace: BuilderWorkspace,
    dry_run: PipelineDryRun,
) -> tuple[Path, Path]:
    builder_manifest = build_builder_bootstrap_manifest(dry_run)
    viewer_scene_manifest = build_viewer_scene_manifest(dry_run)

    _write_json(workspace.builder_manifest, builder_manifest)
    _write_json(workspace.viewer_scene_manifest, viewer_scene_manifest)
    return workspace.builder_manifest, workspace.viewer_scene_manifest


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _graph_object_id(dry_run: PipelineDryRun) -> str:
    declaration = dry_run.ingested_corpus.declaration
    return f"{declaration.source_name}:{declaration.version}"


def _focus_candidate_occurrence_ids(dry_run: PipelineDryRun) -> list[str]:
    ordered_candidates = [
        _initial_focus_occurrence_id(dry_run),
        *dry_run.dag.root_occurrence_ids,
        *(record.occurrence_id for record in dry_run.salience.priority_frontier),
    ]
    deduplicated_candidates: list[str] = []

    for occurrence_id in ordered_candidates:
        if occurrence_id in deduplicated_candidates:
            continue
        deduplicated_candidates.append(occurrence_id)

    return deduplicated_candidates


def _initial_focus_occurrence_id(dry_run: PipelineDryRun) -> str:
    best_occurrence_id = dry_run.dag.root_occurrence_ids[0]
    best_key = (-1, -1.0, -1, "")

    for occurrence in dry_run.dag.nodes:
        salience_record = dry_run.salience.by_occurrence_id(occurrence.occurrence_id)
        candidate_key = (
            dry_run.dag.out_degree(occurrence.occurrence_id),
            salience_record.normalized_score if salience_record is not None else 0.0,
            occurrence.ply,
            occurrence.occurrence_id,
        )
        if candidate_key > best_key:
            best_occurrence_id = occurrence.occurrence_id
            best_key = candidate_key

    return best_occurrence_id


def _move_family_payload(move_family: Any) -> dict[str, str]:
    return {
        "interactionClass": move_family.interaction_class,
        "forcingClass": move_family.forcing_class,
        "specialClass": move_family.special_class,
    }