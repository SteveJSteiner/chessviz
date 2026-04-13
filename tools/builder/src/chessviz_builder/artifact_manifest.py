"""Builder-owned manifest export for viewer runtime exploration."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any, Mapping

from .contracts import (
    BuilderWorkspace,
    CoverageMetadataRecord,
    IdentitySemanticsRecord,
    OccurrenceAnnotationRecord,
    OccurrenceIdentityRecord,
    OccurrenceRegimeRecord,
    RecordProvenance,
    RegimeDeclaration,
    RegimeId,
    REPRESENTATION_SCHEMA_VERSION,
    ResolverInputRecord,
    SharedAnchorRecord,
    TransitionIdentityRecord,
)
from .endgame_table import import_endgame_table, shard_endgame_table_records
from .labeling import ENDGAME_PHASE, MIDDLEGAME_PHASE, OPENING_PHASE
from .opening_table import import_opening_table, shard_opening_table_records
from .pipeline import PipelineDryRun
from .publication import relative_posix_path, write_json

DEFAULT_SCENE_ID = "runtime-exploration-fixture"
PUBLISHED_ASSET_SCHEMA_VERSION = "2026-04-12.n11d.v1"
_ORDERED_REGIME_IDS: tuple[RegimeId, ...] = (
    "opening-table",
    "middlegame-procedural",
    "endgame-table",
)


@dataclass(frozen=True)
class PublishedTableAssetSet:
    regime_id: RegimeId
    asset_set_id: str
    manifest_path: Path
    manifest_hash: str
    relative_manifest_path: str
    source_hash: str
    source_provenance: RecordProvenance
    coverage_metadata: CoverageMetadataRecord
    position_count: int
    shard_count: int


@dataclass(frozen=True)
class PublishedRuntimeSurfaceSet:
    coverage_metadata_payloads: tuple[dict[str, Any], ...]
    resolver_input_payloads: tuple[dict[str, Any], ...]
    regime_declaration_payloads: tuple[dict[str, Any], ...]
    opening_position_keys: frozenset[str]
    endgame_material_signatures_by_position_key: Mapping[str, frozenset[str]]


def build_builder_bootstrap_manifest(
    dry_run: PipelineDryRun,
    published_runtime_surfaces: PublishedRuntimeSurfaceSet | None = None,
) -> dict[str, Any]:
    graph_object_id = _graph_object_id(dry_run)
    identity_semantics = IdentitySemanticsRecord(
        occurrence_key_field="occurrenceId",
        position_key_field="stateKey",
        path_key_field="path",
        continuity_key_field="stateKey",
    )
    if published_runtime_surfaces is None:
        coverage_metadata = _build_coverage_metadata_records(dry_run)
        resolver_inputs = _build_resolver_input_records(coverage_metadata)
        regime_declarations = _build_regime_declarations(
            dry_run,
            coverage_metadata,
            resolver_inputs,
        )
        coverage_metadata_payloads = [
            _coverage_metadata_payload(record) for record in coverage_metadata
        ]
        resolver_input_payloads = [
            _resolver_input_payload(record) for record in resolver_inputs
        ]
        regime_declaration_payloads = [
            _regime_declaration_payload(record) for record in regime_declarations
        ]
    else:
        coverage_metadata_payloads = list(
            published_runtime_surfaces.coverage_metadata_payloads
        )
        resolver_input_payloads = list(
            published_runtime_surfaces.resolver_input_payloads
        )
        regime_declaration_payloads = list(
            published_runtime_surfaces.regime_declaration_payloads
        )
    anchors = _build_shared_anchor_records(dry_run, published_runtime_surfaces)
    occurrence_by_id = {
        occurrence.occurrence_id: occurrence for occurrence in dry_run.occurrences
    }
    departure_rule_by_edge = {
        (rule.parent_occurrence_id, rule.child_occurrence_id): rule
        for rule in dry_run.departure_rules.records
    }

    return {
        "schemaVersion": REPRESENTATION_SCHEMA_VERSION,
        "graphObjectId": graph_object_id,
        "sourceName": dry_run.ingested_corpus.declaration.source_name,
        "version": dry_run.ingested_corpus.declaration.version,
        "identitySemantics": _identity_semantics_payload(identity_semantics),
        "coverageMetadata": coverage_metadata_payloads,
        "resolverInputs": resolver_input_payloads,
        "regimeDeclarations": regime_declaration_payloads,
        "anchors": [_anchor_payload(record) for record in anchors],
        "rootOccurrenceIds": list(dry_run.dag.root_occurrence_ids),
        "leafOccurrenceIds": list(dry_run.dag.leaf_occurrence_ids),
        "priorityFrontierOccurrenceIds": [
            record.occurrence_id for record in dry_run.salience.priority_frontier
        ],
        "occurrences": [
            _occurrence_payload(
                dry_run,
                occurrence,
                label_record,
                salience_record,
                terminal_record,
                embedding_record,
                published_runtime_surfaces,
            )
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
            _transition_payload(
                dry_run,
                transition,
                departure_rule_by_edge[
                    (
                        transition.parent_occurrence_id,
                        transition.child_occurrence_id,
                    )
                ],
                occurrence_by_id,
            )
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


def build_viewer_scene_manifest(
    dry_run: PipelineDryRun,
    published_runtime_surfaces: PublishedRuntimeSurfaceSet | None = None,
) -> dict[str, Any]:
    graph_object_id = _graph_object_id(dry_run)
    initial_focus_occurrence_id = _navigation_anchor_occurrence_ids(
        dry_run,
        published_runtime_surfaces,
    )["middlegame"]
    focus_candidate_occurrence_ids = _focus_candidate_occurrence_ids(
        dry_run,
        published_runtime_surfaces,
    )

    return {
        "sceneId": DEFAULT_SCENE_ID,
        "title": "Runtime Exploration Fixture",
        "summary": "N11 runtime camera grammar over builder-owned transition facts, departure guides, and coarse embedding surfaces.",
        "accentColor": "#0f766e",
        "camera": {
            "position": [0.0, 0.45, 4.2],
            "lookAt": [0.0, 0.0, 0.0],
            "fov": 48,
        },
        "runtime": {
            "graphObjectId": graph_object_id,
            "bootstrap": {
                "representationSchemaVersion": REPRESENTATION_SCHEMA_VERSION,
                "seedSurface": "runtime-bootstrap-materializer:web-corpus+builder-bootstrap",
                "focusCandidatesSource": (
                    "runtime-bootstrap-materializer:declared-anchors-roots-priority-frontier"
                ),
                "entrypointDerivation": "runtime-regime-resolver:navigation-entry-anchors",
                "webCorpusManifest": "builder/web-corpus.json",
                "openingTableManifest": "builder/opening-table/manifest.json",
                "endgameTableManifest": "builder/endgame-table/manifest.json",
                "middlegameProceduralPolicy": (
                    "adjacency-neighborhood+salience-priority-frontier+"
                    "radius-refinement-pruning"
                ),
            },
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
    published_runtime_surfaces = _load_published_runtime_surfaces(workspace)
    builder_manifest = build_builder_bootstrap_manifest(
        dry_run,
        published_runtime_surfaces,
    )
    viewer_scene_manifest = build_viewer_scene_manifest(
        dry_run,
        published_runtime_surfaces,
    )

    _write_json(workspace.builder_manifest, builder_manifest)
    _write_json(workspace.viewer_scene_manifest, viewer_scene_manifest)
    return workspace.builder_manifest, workspace.viewer_scene_manifest


def write_opening_table_assets(
    workspace: BuilderWorkspace,
    dry_run: PipelineDryRun,
    source_path: Path,
) -> PublishedTableAssetSet:
    publication = import_opening_table(source_path, dry_run)
    return _write_table_asset_publication(
        workspace=workspace,
        manifest_path=workspace.opening_table_manifest,
        dry_run=dry_run,
        regime_id="opening-table",
        asset_set_id=publication.asset_set_id,
        source_hash=publication.source_hash,
        source_provenance=publication.source_provenance,
        coverage_metadata=publication.coverage_metadata,
        content_kind="opening-continuations",
        shard_groups=shard_opening_table_records(publication),
    )


def write_endgame_table_assets(
    workspace: BuilderWorkspace,
    dry_run: PipelineDryRun,
    source_path: Path,
) -> PublishedTableAssetSet:
    publication = import_endgame_table(source_path, dry_run)
    return _write_table_asset_publication(
        workspace=workspace,
        manifest_path=workspace.endgame_table_manifest,
        dry_run=dry_run,
        regime_id="endgame-table",
        asset_set_id=publication.asset_set_id,
        source_hash=publication.source_hash,
        source_provenance=publication.source_provenance,
        coverage_metadata=publication.coverage_metadata,
        content_kind="endgame-evaluations",
        shard_groups=shard_endgame_table_records(publication),
    )


def write_web_corpus_artifacts(
    workspace: BuilderWorkspace,
    dry_run: PipelineDryRun,
    opening_source_path: Path,
    endgame_source_path: Path,
) -> tuple[PublishedTableAssetSet, PublishedTableAssetSet, Path, str]:
    opening_assets = write_opening_table_assets(
        workspace,
        dry_run,
        opening_source_path,
    )
    endgame_assets = write_endgame_table_assets(
        workspace,
        dry_run,
        endgame_source_path,
    )
    web_corpus_manifest = build_web_corpus_manifest(
        dry_run,
        opening_assets,
        endgame_assets,
    )
    web_corpus_hash = write_json(workspace.web_corpus_manifest, web_corpus_manifest)
    return (
        opening_assets,
        endgame_assets,
        workspace.web_corpus_manifest,
        web_corpus_hash,
    )


def build_web_corpus_manifest(
    dry_run: PipelineDryRun,
    opening_assets: PublishedTableAssetSet,
    endgame_assets: PublishedTableAssetSet,
) -> dict[str, Any]:
    identity_semantics = IdentitySemanticsRecord(
        occurrence_key_field="occurrenceId",
        position_key_field="stateKey",
        path_key_field="path",
        continuity_key_field="stateKey",
    )
    coverage_metadata = _build_web_corpus_coverage_metadata_records(
        dry_run,
        opening_assets.coverage_metadata,
        endgame_assets.coverage_metadata,
    )
    resolver_inputs = _build_resolver_input_records(coverage_metadata)
    regime_declarations = _build_web_corpus_regime_declarations(
        dry_run,
        coverage_metadata,
        resolver_inputs,
        opening_assets,
        endgame_assets,
    )

    return {
        "schemaVersion": PUBLISHED_ASSET_SCHEMA_VERSION,
        "representationSchemaVersion": REPRESENTATION_SCHEMA_VERSION,
        "graphObjectId": _graph_object_id(dry_run),
        "identitySemantics": _identity_semantics_payload(identity_semantics),
        "coverageMetadata": [
            _coverage_metadata_payload(record) for record in coverage_metadata
        ],
        "resolverInputs": [
            _resolver_input_payload(record) for record in resolver_inputs
        ],
        "regimeDeclarations": [
            _regime_declaration_payload(record) for record in regime_declarations
        ],
        "publishedTableAssets": [
            _published_table_asset_payload(opening_assets),
            _published_table_asset_payload(endgame_assets),
        ],
        "ingestionInputs": {
            "openingImport": _ingestion_input_payload(opening_assets),
            "endgameImport": _ingestion_input_payload(endgame_assets),
        },
    }


def _write_table_asset_publication(
    workspace: BuilderWorkspace,
    manifest_path: Path,
    dry_run: PipelineDryRun,
    regime_id: RegimeId,
    asset_set_id: str,
    source_hash: str,
    source_provenance: RecordProvenance,
    coverage_metadata: CoverageMetadataRecord,
    content_kind: str,
    shard_groups: tuple[tuple[str, tuple[dict[str, Any], ...]], ...],
) -> PublishedTableAssetSet:
    graph_object_id = _graph_object_id(dry_run)
    shard_payloads = []
    position_count = 0

    for shard_id, entries in shard_groups:
        shard_relative_path = Path("shards") / f"{shard_id}.json"
        shard_path = manifest_path.parent / shard_relative_path
        shard_payload = {
            "schemaVersion": PUBLISHED_ASSET_SCHEMA_VERSION,
            "representationSchemaVersion": REPRESENTATION_SCHEMA_VERSION,
            "graphObjectId": graph_object_id,
            "regimeId": regime_id,
            "assetSetId": asset_set_id,
            "contentKind": content_kind,
            "shardId": shard_id,
            "entries": list(entries),
        }
        shard_hash = write_json(shard_path, shard_payload)
        position_count += len(entries)
        shard_payloads.append(
            {
                "shardId": shard_id,
                "relativePath": shard_relative_path.as_posix(),
                "entryCount": len(entries),
                "sha256": shard_hash,
            }
        )

    manifest_payload = {
        "schemaVersion": PUBLISHED_ASSET_SCHEMA_VERSION,
        "representationSchemaVersion": REPRESENTATION_SCHEMA_VERSION,
        "graphObjectId": graph_object_id,
        "regimeId": regime_id,
        "assetSetId": asset_set_id,
        "contentKind": content_kind,
        "coverageMetadata": _coverage_metadata_payload(coverage_metadata),
        "sourceProvenance": _provenance_payload(source_provenance),
        "sourceHash": source_hash,
        "positionCount": position_count,
        "shardCount": len(shard_payloads),
        "shards": shard_payloads,
    }
    manifest_hash = write_json(manifest_path, manifest_payload)

    return PublishedTableAssetSet(
        regime_id=regime_id,
        asset_set_id=asset_set_id,
        manifest_path=manifest_path,
        manifest_hash=manifest_hash,
        relative_manifest_path=relative_posix_path(manifest_path, workspace.artifact_root),
        source_hash=source_hash,
        source_provenance=source_provenance,
        coverage_metadata=coverage_metadata,
        position_count=position_count,
        shard_count=len(shard_payloads),
    )


def _build_web_corpus_coverage_metadata_records(
    dry_run: PipelineDryRun,
    opening_coverage_metadata: CoverageMetadataRecord,
    endgame_coverage_metadata: CoverageMetadataRecord,
) -> tuple[CoverageMetadataRecord, ...]:
    base_coverage_metadata = _build_coverage_metadata_records(dry_run)
    middlegame_coverage = next(
        record
        for record in base_coverage_metadata
        if record.regime_id == "middlegame-procedural"
    )

    return (
        opening_coverage_metadata,
        CoverageMetadataRecord(
            coverage_metadata_id=middlegame_coverage.coverage_metadata_id,
            regime_id=middlegame_coverage.regime_id,
            coverage_kind=middlegame_coverage.coverage_kind,
            summary=(
                "Declared middlegame procedural fallback with no precomputed table "
                "asset publication in N11d."
            ),
            occurrence_count=middlegame_coverage.occurrence_count,
        ),
        endgame_coverage_metadata,
    )


def _build_web_corpus_regime_declarations(
    dry_run: PipelineDryRun,
    coverage_metadata_records: tuple[CoverageMetadataRecord, ...],
    resolver_input_records: tuple[ResolverInputRecord, ...],
    opening_assets: PublishedTableAssetSet,
    endgame_assets: PublishedTableAssetSet,
) -> tuple[RegimeDeclaration, ...]:
    coverage_by_regime = {
        record.regime_id: record for record in coverage_metadata_records
    }
    resolver_by_regime = {
        record.regime_id: record for record in resolver_input_records
    }

    declarations: list[RegimeDeclaration] = []
    for regime_id, label, backing_kind in (
        ("opening-table", "Opening Table", "table"),
        ("middlegame-procedural", "Middlegame Procedural", "procedural"),
        ("endgame-table", "Endgame Table", "table"),
    ):
        if regime_id == "opening-table":
            declarations.append(
                RegimeDeclaration(
                    regime_id=regime_id,
                    label=label,
                    backing_kind=backing_kind,
                    schema_version=REPRESENTATION_SCHEMA_VERSION,
                    coverage_metadata_id=coverage_by_regime[regime_id].coverage_metadata_id,
                    resolver_input_id=resolver_by_regime[regime_id].resolver_input_id,
                    provenance=RecordProvenance(
                        source_kind="builder-regime-declaration",
                        source_name=opening_assets.asset_set_id,
                        source_version=PUBLISHED_ASSET_SCHEMA_VERSION,
                        source_location=opening_assets.relative_manifest_path,
                        detail=(
                            "declared opening-table project-owned asset surface from "
                            f"{opening_assets.relative_manifest_path}"
                        ),
                    ),
                )
            )
            continue

        if regime_id == "endgame-table":
            declarations.append(
                RegimeDeclaration(
                    regime_id=regime_id,
                    label=label,
                    backing_kind=backing_kind,
                    schema_version=REPRESENTATION_SCHEMA_VERSION,
                    coverage_metadata_id=coverage_by_regime[regime_id].coverage_metadata_id,
                    resolver_input_id=resolver_by_regime[regime_id].resolver_input_id,
                    provenance=RecordProvenance(
                        source_kind="builder-regime-declaration",
                        source_name=endgame_assets.asset_set_id,
                        source_version=PUBLISHED_ASSET_SCHEMA_VERSION,
                        source_location=endgame_assets.relative_manifest_path,
                        detail=(
                            "declared endgame-table project-owned asset surface from "
                            f"{endgame_assets.relative_manifest_path}"
                        ),
                    ),
                )
            )
            continue

        declarations.append(
            RegimeDeclaration(
                regime_id=regime_id,
                label=label,
                backing_kind=backing_kind,
                schema_version=REPRESENTATION_SCHEMA_VERSION,
                coverage_metadata_id=coverage_by_regime[regime_id].coverage_metadata_id,
                resolver_input_id=resolver_by_regime[regime_id].resolver_input_id,
                provenance=RecordProvenance(
                    source_kind="builder-regime-declaration",
                    source_name=dry_run.ingested_corpus.declaration.source_name,
                    source_version=dry_run.ingested_corpus.declaration.version,
                    source_location=dry_run.ingested_corpus.declaration.location,
                    detail=(
                        "declared middlegame-procedural fallback alongside published "
                        "opening/endgame table assets for N11d"
                    ),
                ),
            )
        )

    return tuple(declarations)


def _published_table_asset_payload(
    asset: PublishedTableAssetSet,
) -> dict[str, Any]:
    return {
        "regimeId": asset.regime_id,
        "assetSetId": asset.asset_set_id,
        "manifestPath": asset.relative_manifest_path,
        "manifestHash": asset.manifest_hash,
        "coverageMetadataId": asset.coverage_metadata.coverage_metadata_id,
        "positionCount": asset.position_count,
        "shardCount": asset.shard_count,
        "sourceProvenance": _provenance_payload(asset.source_provenance),
        "sourceHash": asset.source_hash,
    }


def _ingestion_input_payload(asset: PublishedTableAssetSet) -> dict[str, Any]:
    return {
        "sourceKind": asset.source_provenance.source_kind,
        "sourceName": asset.source_provenance.source_name,
        "sourceVersion": asset.source_provenance.source_version,
        "sourceLocation": asset.source_provenance.source_location,
        "sourceHash": asset.source_hash,
    }


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _graph_object_id(dry_run: PipelineDryRun) -> str:
    declaration = dry_run.ingested_corpus.declaration
    return f"{declaration.source_name}:{declaration.version}"


def _focus_candidate_occurrence_ids(
    dry_run: PipelineDryRun,
    published_runtime_surfaces: PublishedRuntimeSurfaceSet | None = None,
) -> list[str]:
    ordered_candidates = _focus_candidate_seed_occurrence_ids(
        dry_run,
        published_runtime_surfaces,
    )
    deduplicated_candidates: list[str] = []

    for occurrence_id in ordered_candidates:
        if occurrence_id in deduplicated_candidates:
            continue
        deduplicated_candidates.append(occurrence_id)

    return deduplicated_candidates


def _focus_candidate_seed_occurrence_ids(
    dry_run: PipelineDryRun,
    published_runtime_surfaces: PublishedRuntimeSurfaceSet | None = None,
) -> list[str]:
    middlegame_occurrences = _occurrences_for_regime(
        dry_run,
        "middlegame-procedural",
        published_runtime_surfaces,
    )

    return [
        _select_middlegame_anchor_occurrence_id(
            dry_run,
            middlegame_occurrences,
            published_runtime_surfaces,
        ),
        *dry_run.dag.root_occurrence_ids,
        *(record.occurrence_id for record in dry_run.salience.priority_frontier),
    ]


def _move_family_payload(move_family: Any) -> dict[str, str]:
    return {
        "interactionClass": move_family.interaction_class,
        "forcingClass": move_family.forcing_class,
        "specialClass": move_family.special_class,
    }


def _occurrence_payload(
    dry_run: PipelineDryRun,
    occurrence,
    label_record,
    salience_record,
    terminal_record,
    embedding_record,
    published_runtime_surfaces: PublishedRuntimeSurfaceSet | None = None,
) -> dict[str, Any]:
    annotations = OccurrenceAnnotationRecord(
        phase_label=label_record.phase,
        material_signature=label_record.material_signature,
    )
    candidate_regime_ids = _candidate_regime_ids_for_occurrence(
        occurrence,
        label_record,
        published_runtime_surfaces,
    )
    regime_id = _selected_regime_id(candidate_regime_ids)
    identity = OccurrenceIdentityRecord(
        occurrence_key=occurrence.occurrence_id,
        position_key=occurrence.state_key,
        path_key="|".join(occurrence.path),
        continuity_key=occurrence.state_key,
    )
    regime = OccurrenceRegimeRecord(
        regime_id=regime_id,
        candidate_regime_ids=candidate_regime_ids,
        resolver_input_id=_resolver_input_id(regime_id),
        selection_rule=(
            "declared-regime-membership"
            if published_runtime_surfaces is None
            else "published-regime-resolution"
        ),
    )
    occurrence_provenance = RecordProvenance(
        source_kind="fixture-corpus",
        source_name=dry_run.ingested_corpus.declaration.source_name,
        source_version=dry_run.ingested_corpus.declaration.version,
        source_location=dry_run.ingested_corpus.declaration.location,
        detail=(
            f"occurrence {occurrence.occurrence_id} carried from "
            f"subtree {embedding_record.subtree_key} at ply {occurrence.ply}"
        ),
    )

    return {
        "occurrenceId": occurrence.occurrence_id,
        "stateKey": occurrence.state_key,
        "path": list(occurrence.path),
        "ply": occurrence.ply,
        "identity": _occurrence_identity_payload(identity),
        "annotations": _occurrence_annotation_payload(annotations),
        "regime": _occurrence_regime_payload(regime),
        "provenance": _provenance_payload(occurrence_provenance),
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
            "provenance": _provenance_payload(
                RecordProvenance(
                    source_kind="salience-builder",
                    source_name=dry_run.ingested_corpus.declaration.source_name,
                    source_version=dry_run.ingested_corpus.declaration.version,
                    source_location=dry_run.ingested_corpus.declaration.location,
                    detail=f"salience-v1 score for {occurrence.occurrence_id}",
                )
            ),
        },
        "terminal": (
            {
                "wdlLabel": terminal_record.wdl_label,
                "outcomeClass": terminal_record.outcome_class,
                "anchorId": terminal_record.anchor_id,
                "provenance": _provenance_payload(
                    RecordProvenance(
                        source_kind="terminal-labeler",
                        source_name=dry_run.ingested_corpus.declaration.source_name,
                        source_version=dry_run.ingested_corpus.declaration.version,
                        source_location=dry_run.ingested_corpus.declaration.location,
                        detail=(
                            f"terminal {terminal_record.outcome_class} label for "
                            f"{occurrence.occurrence_id}"
                        ),
                    )
                ),
            }
            if terminal_record is not None
            else None
        ),
        "embedding": {
            "coordinate": list(embedding_record.coordinate),
            "ballRadius": embedding_record.ball_radius,
            "azimuth": embedding_record.azimuth,
            "elevation": embedding_record.elevation,
            "subtreeKey": embedding_record.subtree_key,
            "terminalAnchorId": embedding_record.terminal_anchor_id,
        },
    }


def _transition_payload(
    dry_run: PipelineDryRun,
    transition,
    departure_rule,
    occurrence_by_id,
) -> dict[str, Any]:
    source_occurrence = occurrence_by_id[transition.parent_occurrence_id]
    target_occurrence = occurrence_by_id[transition.child_occurrence_id]
    identity = TransitionIdentityRecord(
        transition_key=(
            f"{transition.parent_occurrence_id}:{transition.child_occurrence_id}"
        ),
        source_occurrence_key=transition.parent_occurrence_id,
        target_occurrence_key=transition.child_occurrence_id,
        source_position_key=source_occurrence.state_key,
        target_position_key=target_occurrence.state_key,
    )
    provenance = RecordProvenance(
        source_kind="fixture-corpus-transition",
        source_name=dry_run.ingested_corpus.declaration.source_name,
        source_version=dry_run.ingested_corpus.declaration.version,
        source_location=dry_run.ingested_corpus.declaration.location,
        detail=(
            f"transition {transition.move_uci} from {transition.parent_occurrence_id} "
            f"to {transition.child_occurrence_id}"
        ),
    )

    return {
        "sourceOccurrenceId": transition.parent_occurrence_id,
        "targetOccurrenceId": transition.child_occurrence_id,
        "identity": _transition_identity_payload(identity),
        "provenance": _provenance_payload(provenance),
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
        "moveFamily": _move_family_payload(departure_rule.move_family),
    }


def _build_coverage_metadata_records(
    dry_run: PipelineDryRun,
) -> tuple[CoverageMetadataRecord, ...]:
    opening_labels = dry_run.labels.for_phase(OPENING_PHASE)
    middlegame_labels = dry_run.labels.for_phase(MIDDLEGAME_PHASE)
    endgame_labels = dry_run.labels.for_phase(ENDGAME_PHASE)

    return (
        CoverageMetadataRecord(
            coverage_metadata_id=_coverage_metadata_id("opening-table"),
            regime_id="opening-table",
            coverage_kind="ply-window",
            summary="Declared opening-table membership over the shared placeholder fixture contract.",
            occurrence_count=len(opening_labels),
            max_ply=max(
                (
                    dry_run.dag.by_occurrence_id(record.occurrence_id).ply
                    for record in opening_labels
                    if dry_run.dag.by_occurrence_id(record.occurrence_id) is not None
                ),
                default=0,
            ),
        ),
        CoverageMetadataRecord(
            coverage_metadata_id=_coverage_metadata_id("middlegame-procedural"),
            regime_id="middlegame-procedural",
            coverage_kind="procedural-fallback",
            summary="Declared middlegame procedural fallback over explicit shared occurrence membership.",
            occurrence_count=len(middlegame_labels),
        ),
        CoverageMetadataRecord(
            coverage_metadata_id=_coverage_metadata_id("endgame-table"),
            regime_id="endgame-table",
            coverage_kind="material-signature-set",
            summary="Declared endgame-table membership over observed terminal-material signatures.",
            occurrence_count=len(endgame_labels),
            supported_material_signatures=tuple(
                sorted(
                    {
                        record.material_signature
                        for record in endgame_labels
                    }
                )
            ),
        ),
    )


def _build_resolver_input_records(
    coverage_metadata_records: tuple[CoverageMetadataRecord, ...],
) -> tuple[ResolverInputRecord, ...]:
    coverage_by_regime = {
        record.regime_id: record for record in coverage_metadata_records
    }
    return (
        ResolverInputRecord(
            resolver_input_id=_resolver_input_id("opening-table"),
            regime_id="opening-table",
            priority=10,
            selector="declared-opening-coverage",
            coverage_metadata_id=coverage_by_regime["opening-table"].coverage_metadata_id,
        ),
        ResolverInputRecord(
            resolver_input_id=_resolver_input_id("endgame-table"),
            regime_id="endgame-table",
            priority=20,
            selector="declared-endgame-coverage",
            coverage_metadata_id=coverage_by_regime["endgame-table"].coverage_metadata_id,
        ),
        ResolverInputRecord(
            resolver_input_id=_resolver_input_id("middlegame-procedural"),
            regime_id="middlegame-procedural",
            priority=30,
            selector="declared-middlegame-fallback",
            coverage_metadata_id=coverage_by_regime[
                "middlegame-procedural"
            ].coverage_metadata_id,
            is_fallback=True,
        ),
    )


def _build_regime_declarations(
    dry_run: PipelineDryRun,
    coverage_metadata_records: tuple[CoverageMetadataRecord, ...],
    resolver_input_records: tuple[ResolverInputRecord, ...],
) -> tuple[RegimeDeclaration, ...]:
    coverage_by_regime = {
        record.regime_id: record for record in coverage_metadata_records
    }
    resolver_by_regime = {
        record.regime_id: record for record in resolver_input_records
    }

    return tuple(
        RegimeDeclaration(
            regime_id=regime_id,
            label=label,
            backing_kind=backing_kind,
            schema_version=REPRESENTATION_SCHEMA_VERSION,
            coverage_metadata_id=coverage_by_regime[regime_id].coverage_metadata_id,
            resolver_input_id=resolver_by_regime[regime_id].resolver_input_id,
            provenance=RecordProvenance(
                source_kind="builder-regime-declaration",
                source_name=dry_run.ingested_corpus.declaration.source_name,
                source_version=dry_run.ingested_corpus.declaration.version,
                source_location=dry_run.ingested_corpus.declaration.location,
                detail=(
                    f"declared {regime_id} contract over placeholder fixture-owned "
                    f"coverage for N11c"
                ),
            ),
        )
        for regime_id, label, backing_kind in (
            ("opening-table", "Opening Table", "table"),
            ("middlegame-procedural", "Middlegame Procedural", "procedural"),
            ("endgame-table", "Endgame Table", "table"),
        )
    )


def _build_shared_anchor_records(
    dry_run: PipelineDryRun,
    published_runtime_surfaces: PublishedRuntimeSurfaceSet | None = None,
) -> tuple[SharedAnchorRecord, ...]:
    occurrence_by_id = {
        occurrence.occurrence_id: occurrence for occurrence in dry_run.occurrences
    }
    embedding_by_occurrence_id = {
        record.occurrence_id: record for record in dry_run.embedding.records
    }
    navigation_anchor_ids = _navigation_anchor_occurrence_ids(
        dry_run,
        published_runtime_surfaces,
    )
    navigation_anchors = []

    for entry_id, occurrence_id in navigation_anchor_ids.items():
        occurrence = occurrence_by_id[occurrence_id]
        embedding = embedding_by_occurrence_id[occurrence_id]
        label_record = dry_run.labels.by_occurrence_id(occurrence_id)
        if label_record is None:
            continue
        regime_id = _selected_regime_id(
            _candidate_regime_ids_for_occurrence(
                occurrence,
                label_record,
                published_runtime_surfaces,
            )
        )
        navigation_anchors.append(
            SharedAnchorRecord(
                anchor_id=f"entry:{entry_id}",
                anchor_kind="navigation-entry",
                label=f"{entry_id.title()} anchor",
                occurrence_ids=(occurrence_id,),
                regime_id=regime_id,
                provenance=RecordProvenance(
                    source_kind="builder-anchor-declaration",
                    source_name=dry_run.ingested_corpus.declaration.source_name,
                    source_version=dry_run.ingested_corpus.declaration.version,
                    source_location=dry_run.ingested_corpus.declaration.location,
                    detail=(
                        f"declared {entry_id} navigation anchor from {regime_id} "
                        f"runtime coverage"
                    ),
                ),
                entry_id=entry_id,
                anchor_ply=occurrence.ply,
                subtree_key=embedding.subtree_key,
            )
        )

    terminal_anchors = []
    for anchor in dry_run.terminal_labels.anchors:
        first_occurrence_id = anchor.occurrence_ids[0]
        first_label = dry_run.labels.by_occurrence_id(first_occurrence_id)
        regime_id = (
            _selected_regime_id(
                _candidate_regime_ids_for_occurrence(
                    occurrence_by_id[first_occurrence_id],
                    first_label,
                    published_runtime_surfaces,
                )
            )
            if first_label is not None
            else None
        )
        terminal_anchors.append(
            SharedAnchorRecord(
                anchor_id=anchor.anchor_id,
                anchor_kind="terminal-outcome",
                label=f"{anchor.outcome_class.title()} terminal",
                occurrence_ids=anchor.occurrence_ids,
                regime_id=regime_id,
                provenance=RecordProvenance(
                    source_kind="terminal-labeler",
                    source_name=dry_run.ingested_corpus.declaration.source_name,
                    source_version=dry_run.ingested_corpus.declaration.version,
                    source_location=dry_run.ingested_corpus.declaration.location,
                    detail=(
                        f"declared terminal anchor {anchor.anchor_id} for "
                        f"{anchor.outcome_class} outcomes"
                    ),
                ),
                wdl_label=anchor.wdl_label,
                outcome_class=anchor.outcome_class,
            )
        )

    return tuple((*navigation_anchors, *terminal_anchors))


def _navigation_anchor_occurrence_ids(
    dry_run: PipelineDryRun,
    published_runtime_surfaces: PublishedRuntimeSurfaceSet | None = None,
) -> dict[str, str]:
    opening_occurrences = [
        occurrence
        for occurrence in _occurrences_for_regime(
            dry_run,
            "opening-table",
            published_runtime_surfaces,
        )
        if occurrence.ply == 0
    ]
    middlegame_occurrences = _occurrences_for_regime(
        dry_run,
        "middlegame-procedural",
        published_runtime_surfaces,
    )
    endgame_occurrences = _occurrences_for_regime(
        dry_run,
        "endgame-table",
        published_runtime_surfaces,
    )

    if not opening_occurrences or not middlegame_occurrences or not endgame_occurrences:
        raise ValueError("missing required declared regime anchor coverage")

    opening_occurrence_ids = {
        occurrence.occurrence_id for occurrence in opening_occurrences
    }
    preferred_opening_occurrence_id = next(
        (
            occurrence_id
            for occurrence_id in _focus_candidate_seed_occurrence_ids(
                dry_run,
                published_runtime_surfaces,
            )
            if occurrence_id in opening_occurrence_ids
        ),
        None,
    )

    return {
        "opening": (
            preferred_opening_occurrence_id
            or sorted(
                opening_occurrences,
                key=lambda occurrence: _opening_anchor_key(dry_run, occurrence),
            )[0].occurrence_id
        ),
        "middlegame": _select_middlegame_anchor_occurrence_id(
            dry_run,
            middlegame_occurrences,
            published_runtime_surfaces,
        ),
        "endgame": sorted(endgame_occurrences, key=lambda occurrence: _endgame_anchor_key(dry_run, occurrence))[0].occurrence_id,
    }


def _select_middlegame_anchor_occurrence_id(
    dry_run: PipelineDryRun,
    middlegame_occurrences,
    published_runtime_surfaces: PublishedRuntimeSurfaceSet | None = None,
) -> str:
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

    middlegame_occurrence_ids = {
        occurrence.occurrence_id for occurrence in middlegame_occurrences
    }

    if best_occurrence_id in middlegame_occurrence_ids:
        return best_occurrence_id

    return sorted(
        middlegame_occurrences,
        key=lambda occurrence: _middlegame_anchor_key(dry_run, occurrence),
    )[0].occurrence_id


def _opening_anchor_key(dry_run: PipelineDryRun, occurrence) -> tuple[float, int, str, str]:
    salience_record = dry_run.salience.by_occurrence_id(occurrence.occurrence_id)
    embedding_record = dry_run.embedding.by_occurrence_id(occurrence.occurrence_id)
    return (
        -(salience_record.normalized_score if salience_record is not None else 0.0),
        occurrence.ply,
        embedding_record.subtree_key if embedding_record is not None else "",
        occurrence.occurrence_id,
    )


def _middlegame_anchor_key(
    dry_run: PipelineDryRun,
    occurrence,
) -> tuple[int, float, int, str, str]:
    salience_record = dry_run.salience.by_occurrence_id(occurrence.occurrence_id)
    embedding_record = dry_run.embedding.by_occurrence_id(occurrence.occurrence_id)
    terminal_record = dry_run.terminal_labels.by_occurrence_id(occurrence.occurrence_id)
    return (
        0 if terminal_record is None else 1,
        -(salience_record.normalized_score if salience_record is not None else 0.0),
        occurrence.ply,
        embedding_record.subtree_key if embedding_record is not None else "",
        occurrence.occurrence_id,
    )


def _endgame_anchor_key(dry_run: PipelineDryRun, occurrence) -> tuple[int, float, str, str]:
    salience_record = dry_run.salience.by_occurrence_id(occurrence.occurrence_id)
    embedding_record = dry_run.embedding.by_occurrence_id(occurrence.occurrence_id)
    return (
        occurrence.ply,
        -(salience_record.normalized_score if salience_record is not None else 0.0),
        embedding_record.subtree_key if embedding_record is not None else "",
        occurrence.occurrence_id,
    )


def _occurrences_for_regime(
    dry_run: PipelineDryRun,
    regime_id: RegimeId,
    published_runtime_surfaces: PublishedRuntimeSurfaceSet | None = None,
):
    occurrences = []

    for occurrence in dry_run.occurrences:
        label_record = dry_run.labels.by_occurrence_id(occurrence.occurrence_id)

        if label_record is None:
            continue

        if (
            _selected_regime_id(
                _candidate_regime_ids_for_occurrence(
                    occurrence,
                    label_record,
                    published_runtime_surfaces,
                )
            )
            == regime_id
        ):
            occurrences.append(occurrence)

    return occurrences


def _candidate_regime_ids_for_occurrence(
    occurrence,
    label_record,
    published_runtime_surfaces: PublishedRuntimeSurfaceSet | None = None,
) -> tuple[RegimeId, ...]:
    if published_runtime_surfaces is None:
        return (_regime_id_for_phase(label_record.phase),)

    candidate_regime_ids: list[RegimeId] = []

    if occurrence.state_key in published_runtime_surfaces.opening_position_keys:
        candidate_regime_ids.append("opening-table")

    endgame_material_signatures = (
        published_runtime_surfaces.endgame_material_signatures_by_position_key.get(
            occurrence.state_key,
            frozenset(),
        )
    )
    if label_record.material_signature in endgame_material_signatures:
        candidate_regime_ids.append("endgame-table")

    if not candidate_regime_ids:
        candidate_regime_ids.append("middlegame-procedural")

    return tuple(candidate_regime_ids)


def _selected_regime_id(candidate_regime_ids: tuple[RegimeId, ...]) -> RegimeId:
    if "opening-table" in candidate_regime_ids:
        return "opening-table"
    if "endgame-table" in candidate_regime_ids:
        return "endgame-table"
    return "middlegame-procedural"


def _has_phase_label(
    dry_run: PipelineDryRun,
    occurrence_id: str,
    expected_phase: str,
) -> bool:
    label_record = dry_run.labels.by_occurrence_id(occurrence_id)
    return label_record is not None and label_record.phase == expected_phase


def _regime_id_for_phase(phase_label: str) -> RegimeId:
    if phase_label == OPENING_PHASE:
        return "opening-table"
    if phase_label == MIDDLEGAME_PHASE:
        return "middlegame-procedural"
    if phase_label == ENDGAME_PHASE:
        return "endgame-table"
    raise ValueError(f"unknown phase label for regime declaration: {phase_label}")


def _coverage_metadata_id(regime_id: RegimeId) -> str:
    return f"coverage:{regime_id}"


def _resolver_input_id(regime_id: RegimeId) -> str:
    return f"resolver:{regime_id}"


def _identity_semantics_payload(identity_semantics: IdentitySemanticsRecord) -> dict[str, str]:
    return {
        "occurrenceKeyField": identity_semantics.occurrence_key_field,
        "positionKeyField": identity_semantics.position_key_field,
        "pathKeyField": identity_semantics.path_key_field,
        "continuityKeyField": identity_semantics.continuity_key_field,
    }


def _coverage_metadata_payload(record: CoverageMetadataRecord) -> dict[str, Any]:
    return {
        "coverageMetadataId": record.coverage_metadata_id,
        "regimeId": record.regime_id,
        "coverageKind": record.coverage_kind,
        "summary": record.summary,
        "occurrenceCount": record.occurrence_count,
        "maxPly": record.max_ply,
        "supportedMaterialSignatures": list(record.supported_material_signatures),
    }


def _resolver_input_payload(record: ResolverInputRecord) -> dict[str, Any]:
    return {
        "resolverInputId": record.resolver_input_id,
        "regimeId": record.regime_id,
        "priority": record.priority,
        "selector": record.selector,
        "coverageMetadataId": record.coverage_metadata_id,
        "isFallback": record.is_fallback,
    }


def _regime_declaration_payload(record: RegimeDeclaration) -> dict[str, Any]:
    return {
        "regimeId": record.regime_id,
        "label": record.label,
        "backingKind": record.backing_kind,
        "schemaVersion": record.schema_version,
        "coverageMetadataId": record.coverage_metadata_id,
        "resolverInputId": record.resolver_input_id,
        "provenance": _provenance_payload(record.provenance),
    }


def _anchor_payload(record: SharedAnchorRecord) -> dict[str, Any]:
    return {
        "anchorId": record.anchor_id,
        "anchorKind": record.anchor_kind,
        "label": record.label,
        "occurrenceIds": list(record.occurrence_ids),
        "regimeId": record.regime_id,
        "provenance": _provenance_payload(record.provenance),
        "entryId": record.entry_id,
        "wdlLabel": record.wdl_label,
        "outcomeClass": record.outcome_class,
        "anchorPly": record.anchor_ply,
        "subtreeKey": record.subtree_key,
    }


def _occurrence_identity_payload(record: OccurrenceIdentityRecord) -> dict[str, str]:
    return {
        "occurrenceKey": record.occurrence_key,
        "positionKey": record.position_key,
        "pathKey": record.path_key,
        "continuityKey": record.continuity_key,
    }


def _transition_identity_payload(record: TransitionIdentityRecord) -> dict[str, str]:
    return {
        "transitionKey": record.transition_key,
        "sourceOccurrenceKey": record.source_occurrence_key,
        "targetOccurrenceKey": record.target_occurrence_key,
        "sourcePositionKey": record.source_position_key,
        "targetPositionKey": record.target_position_key,
    }


def _occurrence_annotation_payload(record: OccurrenceAnnotationRecord) -> dict[str, str]:
    return {
        "phaseLabel": record.phase_label,
        "materialSignature": record.material_signature,
    }


def _occurrence_regime_payload(record: OccurrenceRegimeRecord) -> dict[str, Any]:
    return {
        "regimeId": record.regime_id,
        "candidateRegimeIds": list(record.candidate_regime_ids),
        "resolverInputId": record.resolver_input_id,
        "selectionRule": record.selection_rule,
    }


def _provenance_payload(record: RecordProvenance) -> dict[str, str]:
    return {
        "sourceKind": record.source_kind,
        "sourceName": record.source_name,
        "sourceVersion": record.source_version,
        "sourceLocation": record.source_location,
        "detail": record.detail,
    }


def _load_published_runtime_surfaces(
    workspace: BuilderWorkspace,
) -> PublishedRuntimeSurfaceSet:
    required_paths = (
        workspace.web_corpus_manifest,
        workspace.opening_table_manifest,
        workspace.endgame_table_manifest,
    )
    missing_paths = [path for path in required_paths if not path.exists()]

    if missing_paths:
        missing_summary = ", ".join(path.as_posix() for path in missing_paths)
        raise ValueError(
            "missing published runtime assets; build-web-corpus must run before "
            f"export-fixture-artifacts ({missing_summary})"
        )

    web_corpus_payload = _read_json(workspace.web_corpus_manifest)

    return PublishedRuntimeSurfaceSet(
        coverage_metadata_payloads=tuple(web_corpus_payload["coverageMetadata"]),
        resolver_input_payloads=tuple(web_corpus_payload["resolverInputs"]),
        regime_declaration_payloads=tuple(web_corpus_payload["regimeDeclarations"]),
        opening_position_keys=_load_opening_position_keys(
            workspace.opening_table_manifest
        ),
        endgame_material_signatures_by_position_key=_load_endgame_material_signatures(
            workspace.endgame_table_manifest
        ),
    )


def _load_opening_position_keys(manifest_path: Path) -> frozenset[str]:
    manifest_payload = _read_json(manifest_path)
    position_keys: set[str] = set()

    for descriptor in manifest_payload["shards"]:
        shard_payload = _read_json(manifest_path.parent / descriptor["relativePath"])
        for entry in shard_payload["entries"]:
            position_keys.add(entry["positionKey"])

    return frozenset(position_keys)


def _load_endgame_material_signatures(
    manifest_path: Path,
) -> Mapping[str, frozenset[str]]:
    manifest_payload = _read_json(manifest_path)
    material_signatures_by_position_key: dict[str, set[str]] = {}

    for descriptor in manifest_payload["shards"]:
        shard_payload = _read_json(manifest_path.parent / descriptor["relativePath"])
        for entry in shard_payload["entries"]:
            material_signatures_by_position_key.setdefault(
                entry["positionKey"],
                set(),
            ).add(entry["materialSignature"])

    return {
        position_key: frozenset(material_signatures)
        for position_key, material_signatures in material_signatures_by_position_key.items()
    }


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))
