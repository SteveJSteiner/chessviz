"""Shared builder interfaces for the placeholder builder pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Mapping, Protocol, Sequence

import chess

Vector3 = tuple[float, float, float]
REPRESENTATION_SCHEMA_VERSION = "2026-04-12.n11c.v1"
RegimeId = Literal[
    "opening-table",
    "middlegame-procedural",
    "endgame-table",
]


@dataclass(frozen=True)
class IdentitySemanticsRecord:
    occurrence_key_field: str
    position_key_field: str
    path_key_field: str
    continuity_key_field: str


@dataclass(frozen=True)
class RecordProvenance:
    source_kind: str
    source_name: str
    source_version: str
    source_location: str
    detail: str


@dataclass(frozen=True)
class OccurrenceIdentityRecord:
    occurrence_key: str
    position_key: str
    path_key: str
    continuity_key: str


@dataclass(frozen=True)
class TransitionIdentityRecord:
    transition_key: str
    source_occurrence_key: str
    target_occurrence_key: str
    source_position_key: str
    target_position_key: str


@dataclass(frozen=True)
class OccurrenceAnnotationRecord:
    phase_label: str
    material_signature: str


@dataclass(frozen=True)
class CoverageMetadataRecord:
    coverage_metadata_id: str
    regime_id: RegimeId
    coverage_kind: str
    summary: str
    occurrence_count: int
    max_ply: int | None = None
    supported_material_signatures: tuple[str, ...] = tuple()


@dataclass(frozen=True)
class ResolverInputRecord:
    resolver_input_id: str
    regime_id: RegimeId
    priority: int
    selector: str
    coverage_metadata_id: str
    is_fallback: bool = False


@dataclass(frozen=True)
class OccurrenceRegimeRecord:
    regime_id: RegimeId
    candidate_regime_ids: tuple[RegimeId, ...]
    resolver_input_id: str
    selection_rule: str


@dataclass(frozen=True)
class RegimeDeclaration:
    regime_id: RegimeId
    label: str
    backing_kind: str
    schema_version: str
    coverage_metadata_id: str
    resolver_input_id: str
    provenance: RecordProvenance


@dataclass(frozen=True)
class SharedAnchorRecord:
    anchor_id: str
    anchor_kind: str
    label: str
    occurrence_ids: tuple[str, ...]
    regime_id: RegimeId | None
    provenance: RecordProvenance
    entry_id: str | None = None
    wdl_label: str | None = None
    outcome_class: str | None = None
    anchor_ply: int | None = None
    root_game_id: str | None = None


@dataclass(frozen=True)
class BuilderWorkspace:
    repository_root: Path
    artifact_root: Path
    builder_manifest: Path
    viewer_scene_manifest: Path
    opening_table_manifest: Path
    endgame_table_manifest: Path
    web_corpus_manifest: Path
    stockfish_bin: Path | None
    syzygy_dir: Path | None


@dataclass(frozen=True)
class CorpusDeclaration:
    source_name: str
    version: str
    location: str


@dataclass(frozen=True)
class StateKeyComponents:
    board_fen: str
    turn: str
    castling: str
    legal_en_passant: str

    @property
    def canonical_key(self) -> str:
        return " ".join(
            (self.board_fen, self.turn, self.castling, self.legal_en_passant)
        )


@dataclass(frozen=True)
class OccurrenceRecord:
    occurrence_id: str
    state_key: str
    path: tuple[str, ...]
    ply: int = 0


@dataclass(frozen=True)
class MoveFactRecord:
    san: str
    moving_piece: str
    captured_piece: str | None
    promotion_piece: str | None
    is_capture: bool
    is_check: bool
    is_checkmate: bool
    is_castle: bool
    castle_side: str | None
    is_en_passant: bool


@dataclass(frozen=True)
class MoveFamilyClassification:
    interaction_class: str
    forcing_class: str
    special_class: str


@dataclass(frozen=True)
class OccurrenceTransition:
    parent_occurrence_id: str
    child_occurrence_id: str
    move_uci: str
    ply: int
    move_facts: MoveFactRecord


@dataclass(frozen=True)
class TransitionDepartureRuleRecord:
    parent_occurrence_id: str
    child_occurrence_id: str
    move_uci: str
    ply: int
    move_family: MoveFamilyClassification
    centerline_profile: str
    departure_strength: float
    lateral_offset: float
    vertical_lift: float
    curvature: float
    twist: float


@dataclass(frozen=True)
class TransitionDepartureQuerySurface:
    records: tuple[TransitionDepartureRuleRecord, ...]
    _records_by_edge: Mapping[tuple[str, str], TransitionDepartureRuleRecord]
    _records_by_interaction_class: Mapping[
        str, tuple[TransitionDepartureRuleRecord, ...]
    ]
    _records_by_centerline_profile: Mapping[
        str, tuple[TransitionDepartureRuleRecord, ...]
    ]

    @classmethod
    def from_records(
        cls,
        records: Sequence[TransitionDepartureRuleRecord],
    ) -> "TransitionDepartureQuerySurface":
        ordered_records = tuple(records)
        interaction_buckets: dict[str, list[TransitionDepartureRuleRecord]] = {}
        profile_buckets: dict[str, list[TransitionDepartureRuleRecord]] = {}

        for record in ordered_records:
            interaction_buckets.setdefault(
                record.move_family.interaction_class,
                [],
            ).append(record)
            profile_buckets.setdefault(record.centerline_profile, []).append(record)

        return cls(
            records=ordered_records,
            _records_by_edge={
                (record.parent_occurrence_id, record.child_occurrence_id): record
                for record in ordered_records
            },
            _records_by_interaction_class={
                interaction_class: tuple(interaction_records)
                for interaction_class, interaction_records in interaction_buckets.items()
            },
            _records_by_centerline_profile={
                centerline_profile: tuple(profile_records)
                for centerline_profile, profile_records in profile_buckets.items()
            },
        )

    @property
    def interaction_classes(self) -> tuple[str, ...]:
        return tuple(self._records_by_interaction_class)

    @property
    def centerline_profiles(self) -> tuple[str, ...]:
        return tuple(self._records_by_centerline_profile)

    def __len__(self) -> int:
        return len(self.records)

    def by_edge(
        self,
        parent_occurrence_id: str,
        child_occurrence_id: str,
    ) -> TransitionDepartureRuleRecord | None:
        return self._records_by_edge.get((parent_occurrence_id, child_occurrence_id))

    def for_interaction_class(
        self,
        interaction_class: str,
    ) -> tuple[TransitionDepartureRuleRecord, ...]:
        return self._records_by_interaction_class.get(interaction_class, tuple())

    def for_centerline_profile(
        self,
        centerline_profile: str,
    ) -> tuple[TransitionDepartureRuleRecord, ...]:
        return self._records_by_centerline_profile.get(
            centerline_profile,
            tuple(),
        )


@dataclass(frozen=True)
class IngestedGame:
    game_id: str
    occurrences: tuple[OccurrenceRecord, ...]
    transitions: tuple[OccurrenceTransition, ...]
    declared_terminal_outcome: str | None = None

    @property
    def final_occurrence(self) -> OccurrenceRecord:
        return self.occurrences[-1]


@dataclass(frozen=True)
class IngestedCorpus:
    declaration: CorpusDeclaration
    games: tuple[IngestedGame, ...]

    @property
    def occurrences(self) -> tuple[OccurrenceRecord, ...]:
        ordered_occurrences: list[OccurrenceRecord] = []
        seen_occurrence_ids: set[str] = set()

        for game in self.games:
            for occurrence in game.occurrences:
                if occurrence.occurrence_id in seen_occurrence_ids:
                    continue
                seen_occurrence_ids.add(occurrence.occurrence_id)
                ordered_occurrences.append(occurrence)

        return tuple(ordered_occurrences)

    @property
    def transitions(self) -> tuple[OccurrenceTransition, ...]:
        ordered_transitions: list[OccurrenceTransition] = []
        seen_transition_edges: set[tuple[str, str]] = set()

        for game in self.games:
            for transition in game.transitions:
                edge = (
                    transition.parent_occurrence_id,
                    transition.child_occurrence_id,
                )
                if edge in seen_transition_edges:
                    continue
                seen_transition_edges.add(edge)
                ordered_transitions.append(transition)

        return tuple(ordered_transitions)


@dataclass(frozen=True)
class StateRelationRecord:
    state_key: str
    occurrences: tuple[OccurrenceRecord, ...]

    @property
    def occurrence_ids(self) -> tuple[str, ...]:
        return tuple(occurrence.occurrence_id for occurrence in self.occurrences)

    @property
    def is_repeated(self) -> bool:
        return len(self.occurrences) > 1


@dataclass(frozen=True)
class RepeatedStateQuerySurface:
    relations: tuple[StateRelationRecord, ...]
    _relations_by_state_key: Mapping[str, StateRelationRecord]
    _relations_by_occurrence_id: Mapping[str, StateRelationRecord]

    @classmethod
    def from_relations(
        cls,
        relations: Sequence[StateRelationRecord],
    ) -> "RepeatedStateQuerySurface":
        ordered_relations = tuple(relations)
        return cls(
            relations=ordered_relations,
            _relations_by_state_key={
                relation.state_key: relation for relation in ordered_relations
            },
            _relations_by_occurrence_id={
                occurrence.occurrence_id: relation
                for relation in ordered_relations
                for occurrence in relation.occurrences
            },
        )

    @property
    def repeated_relations(self) -> tuple[StateRelationRecord, ...]:
        return tuple(relation for relation in self.relations if relation.is_repeated)

    @property
    def singleton_relations(self) -> tuple[StateRelationRecord, ...]:
        return tuple(relation for relation in self.relations if not relation.is_repeated)

    def by_state_key(self, state_key: str) -> StateRelationRecord | None:
        return self._relations_by_state_key.get(state_key)

    def by_occurrence_id(self, occurrence_id: str) -> StateRelationRecord | None:
        return self._relations_by_occurrence_id.get(occurrence_id)


@dataclass(frozen=True)
class OccurrenceLabelRecord:
    occurrence_id: str
    phase: str
    material_signature: str


@dataclass(frozen=True)
class OccurrenceLabelQuerySurface:
    records: tuple[OccurrenceLabelRecord, ...]
    _records_by_occurrence_id: Mapping[str, OccurrenceLabelRecord]
    _records_by_phase: Mapping[str, tuple[OccurrenceLabelRecord, ...]]
    _records_by_material_signature: Mapping[str, tuple[OccurrenceLabelRecord, ...]]
    _records_by_phase_and_material_signature: Mapping[
        tuple[str, str], tuple[OccurrenceLabelRecord, ...]
    ]

    @classmethod
    def from_records(
        cls,
        records: Sequence[OccurrenceLabelRecord],
    ) -> "OccurrenceLabelQuerySurface":
        ordered_records = tuple(records)
        phase_buckets: dict[str, list[OccurrenceLabelRecord]] = {}
        material_buckets: dict[str, list[OccurrenceLabelRecord]] = {}
        phase_material_buckets: dict[
            tuple[str, str], list[OccurrenceLabelRecord]
        ] = {}

        for record in ordered_records:
            phase_buckets.setdefault(record.phase, []).append(record)
            material_buckets.setdefault(record.material_signature, []).append(record)
            phase_material_buckets.setdefault(
                (record.phase, record.material_signature),
                [],
            ).append(record)

        return cls(
            records=ordered_records,
            _records_by_occurrence_id={
                record.occurrence_id: record for record in ordered_records
            },
            _records_by_phase={
                phase: tuple(phase_records)
                for phase, phase_records in phase_buckets.items()
            },
            _records_by_material_signature={
                material_signature: tuple(material_records)
                for material_signature, material_records in material_buckets.items()
            },
            _records_by_phase_and_material_signature={
                phase_and_material: tuple(label_records)
                for phase_and_material, label_records in phase_material_buckets.items()
            },
        )

    @property
    def phases(self) -> tuple[str, ...]:
        return tuple(self._records_by_phase)

    @property
    def material_signatures(self) -> tuple[str, ...]:
        return tuple(self._records_by_material_signature)

    def __len__(self) -> int:
        return len(self.records)

    def by_occurrence_id(self, occurrence_id: str) -> OccurrenceLabelRecord | None:
        return self._records_by_occurrence_id.get(occurrence_id)

    def for_phase(self, phase: str) -> tuple[OccurrenceLabelRecord, ...]:
        return self._records_by_phase.get(phase, tuple())

    def for_material_signature(
        self,
        material_signature: str,
    ) -> tuple[OccurrenceLabelRecord, ...]:
        return self._records_by_material_signature.get(material_signature, tuple())

    def for_phase_and_material_signature(
        self,
        phase: str,
        material_signature: str,
    ) -> tuple[OccurrenceLabelRecord, ...]:
        return self._records_by_phase_and_material_signature.get(
            (phase, material_signature),
            tuple(),
        )


@dataclass(frozen=True)
class TerminalLabelRecord:
    occurrence_id: str
    wdl_label: str
    outcome_class: str
    anchor_id: str


@dataclass(frozen=True)
class TerminalAnchorRecord:
    anchor_id: str
    wdl_label: str
    outcome_class: str
    occurrence_ids: tuple[str, ...]


@dataclass(frozen=True)
class TerminalLabelQuerySurface:
    records: tuple[TerminalLabelRecord, ...]
    anchors: tuple[TerminalAnchorRecord, ...]
    _records_by_occurrence_id: Mapping[str, TerminalLabelRecord]
    _records_by_wdl_label: Mapping[str, tuple[TerminalLabelRecord, ...]]
    _records_by_outcome_class: Mapping[str, tuple[TerminalLabelRecord, ...]]
    _anchors_by_anchor_id: Mapping[str, TerminalAnchorRecord]

    @classmethod
    def from_records(
        cls,
        records: Sequence[TerminalLabelRecord],
    ) -> "TerminalLabelQuerySurface":
        ordered_records = tuple(records)
        wdl_buckets: dict[str, list[TerminalLabelRecord]] = {}
        outcome_buckets: dict[str, list[TerminalLabelRecord]] = {}
        anchor_buckets: dict[str, list[TerminalLabelRecord]] = {}

        for record in ordered_records:
            wdl_buckets.setdefault(record.wdl_label, []).append(record)
            outcome_buckets.setdefault(record.outcome_class, []).append(record)
            anchor_buckets.setdefault(record.anchor_id, []).append(record)

        anchors = tuple(
            TerminalAnchorRecord(
                anchor_id=anchor_id,
                wdl_label=anchor_records[0].wdl_label,
                outcome_class=anchor_records[0].outcome_class,
                occurrence_ids=tuple(
                    record.occurrence_id for record in anchor_records
                ),
            )
            for anchor_id, anchor_records in anchor_buckets.items()
        )

        return cls(
            records=ordered_records,
            anchors=anchors,
            _records_by_occurrence_id={
                record.occurrence_id: record for record in ordered_records
            },
            _records_by_wdl_label={
                wdl_label: tuple(wdl_records)
                for wdl_label, wdl_records in wdl_buckets.items()
            },
            _records_by_outcome_class={
                outcome_class: tuple(outcome_records)
                for outcome_class, outcome_records in outcome_buckets.items()
            },
            _anchors_by_anchor_id={
                anchor.anchor_id: anchor for anchor in anchors
            },
        )

    @property
    def wdl_labels(self) -> tuple[str, ...]:
        return tuple(self._records_by_wdl_label)

    @property
    def outcome_classes(self) -> tuple[str, ...]:
        return tuple(self._records_by_outcome_class)

    def __len__(self) -> int:
        return len(self.records)

    def by_occurrence_id(self, occurrence_id: str) -> TerminalLabelRecord | None:
        return self._records_by_occurrence_id.get(occurrence_id)

    def for_wdl_label(self, wdl_label: str) -> tuple[TerminalLabelRecord, ...]:
        return self._records_by_wdl_label.get(wdl_label, tuple())

    def for_outcome_class(
        self,
        outcome_class: str,
    ) -> tuple[TerminalLabelRecord, ...]:
        return self._records_by_outcome_class.get(outcome_class, tuple())

    def by_anchor_id(self, anchor_id: str) -> TerminalAnchorRecord | None:
        return self._anchors_by_anchor_id.get(anchor_id)


@dataclass(frozen=True)
class SalienceConfig:
    frequency_weight: float
    terminal_pull_weight: float
    centrality_weight: float
    normalization: str
    top_k_frontier: int


@dataclass(frozen=True)
class RuntimePriorityHintRecord:
    occurrence_id: str
    priority_rank: int
    priority_band: str
    retain_from_zoom: str


@dataclass(frozen=True)
class SalienceRecord:
    occurrence_id: str
    raw_score: float
    normalized_score: float
    frequency_signal: float
    terminal_pull_signal: float
    centrality_signal: float
    priority_hint: RuntimePriorityHintRecord


@dataclass(frozen=True)
class SalienceQuerySurface:
    records: tuple[SalienceRecord, ...]
    config: SalienceConfig
    _records_by_occurrence_id: Mapping[str, SalienceRecord]
    _records_by_priority_band: Mapping[str, tuple[SalienceRecord, ...]]

    @classmethod
    def from_records(
        cls,
        records: Sequence[SalienceRecord],
        config: SalienceConfig,
    ) -> "SalienceQuerySurface":
        ordered_records = tuple(records)
        priority_buckets: dict[str, list[SalienceRecord]] = {}

        for record in ordered_records:
            priority_buckets.setdefault(
                record.priority_hint.priority_band,
                [],
            ).append(record)

        return cls(
            records=ordered_records,
            config=config,
            _records_by_occurrence_id={
                record.occurrence_id: record for record in ordered_records
            },
            _records_by_priority_band={
                priority_band: tuple(priority_records)
                for priority_band, priority_records in priority_buckets.items()
            },
        )

    @property
    def priority_bands(self) -> tuple[str, ...]:
        return tuple(self._records_by_priority_band)

    @property
    def priority_frontier(self) -> tuple[SalienceRecord, ...]:
        return self.top_k(self.config.top_k_frontier)

    def __len__(self) -> int:
        return len(self.records)

    def by_occurrence_id(self, occurrence_id: str) -> SalienceRecord | None:
        return self._records_by_occurrence_id.get(occurrence_id)

    def top_k(self, count: int) -> tuple[SalienceRecord, ...]:
        return self.records[:count]

    def for_priority_band(self, priority_band: str) -> tuple[SalienceRecord, ...]:
        return self._records_by_priority_band.get(priority_band, tuple())


@dataclass(frozen=True)
class EmbeddingConfig:
    seed: int
    root_ring_radius: float
    max_radius: float
    radial_scale: float
    move_angle_scale: float
    move_angle_decay: float
    repeated_state_pull: float
    phase_pitch: float
    terminal_pitch: float


@dataclass(frozen=True)
class EmbeddingRecord:
    occurrence_id: str
    coordinate: Vector3
    ball_radius: float
    azimuth: float
    elevation: float
    root_game_id: str
    terminal_anchor_id: str | None


@dataclass(frozen=True)
class DagMetrics:
    node_count: int
    edge_count: int
    root_count: int
    leaf_count: int
    max_out_degree: int
    max_in_degree: int
    repeated_state_group_count: int
    repeated_state_occurrence_count: int
    max_state_convergence: int


@dataclass(frozen=True)
class DagArtifact:
    nodes: tuple[OccurrenceRecord, ...]
    edges: tuple[tuple[str, str], ...]
    source_name: str
    root_occurrence_ids: tuple[str, ...]
    leaf_occurrence_ids: tuple[str, ...]
    metrics: DagMetrics
    _nodes_by_occurrence_id: Mapping[str, OccurrenceRecord]
    _parents_by_occurrence_id: Mapping[str, tuple[str, ...]]
    _children_by_occurrence_id: Mapping[str, tuple[str, ...]]

    def by_occurrence_id(self, occurrence_id: str) -> OccurrenceRecord | None:
        return self._nodes_by_occurrence_id.get(occurrence_id)

    def parents_of(self, occurrence_id: str) -> tuple[OccurrenceRecord, ...]:
        return tuple(
            self._nodes_by_occurrence_id[parent_id]
            for parent_id in self._parents_by_occurrence_id.get(occurrence_id, tuple())
        )

    def children_of(self, occurrence_id: str) -> tuple[OccurrenceRecord, ...]:
        return tuple(
            self._nodes_by_occurrence_id[child_id]
            for child_id in self._children_by_occurrence_id.get(occurrence_id, tuple())
        )

    def in_degree(self, occurrence_id: str) -> int:
        return len(self._parents_by_occurrence_id.get(occurrence_id, tuple()))

    def out_degree(self, occurrence_id: str) -> int:
        return len(self._children_by_occurrence_id.get(occurrence_id, tuple()))


@dataclass(frozen=True)
class EmbeddingArtifact:
    dag: DagArtifact
    config: EmbeddingConfig
    records: tuple[EmbeddingRecord, ...]
    coordinates: Mapping[str, Vector3]
    _records_by_occurrence_id: Mapping[str, EmbeddingRecord]

    def __len__(self) -> int:
        return len(self.records)

    def by_occurrence_id(self, occurrence_id: str) -> EmbeddingRecord | None:
        return self._records_by_occurrence_id.get(occurrence_id)


class StateKeyProvider(Protocol):
    def components_for_board(self, board: chess.Board) -> StateKeyComponents:
        """Build canonical state-key components from a board alone."""

    def key_for_board(self, board: chess.Board) -> str:
        """Build a stable canonical key from a board alone."""


class OccurrenceIdentityProvider(Protocol):
    def identify(
        self,
        state_key: str,
        path: Sequence[str],
        ply: int = 0,
    ) -> OccurrenceRecord:
        """Create a stable occurrence id from a state key and path."""


class CorpusIngestor(Protocol):
    def ingest(self, declaration: CorpusDeclaration) -> IngestedCorpus:
        """Convert a declared corpus slice into continuous occurrence paths."""


class DagBuilder(Protocol):
    def build(
        self,
        declaration: CorpusDeclaration,
        ingested_corpus: IngestedCorpus,
        repeated_state_query_surface: RepeatedStateQuerySurface,
    ) -> DagArtifact:
        """Build a DAG artifact from ingested occurrence paths."""


class RepeatedStateQueryBuilder(Protocol):
    def build(self, ingested_corpus: IngestedCorpus) -> RepeatedStateQuerySurface:
        """Build a repeated-state query surface from ingested occurrences."""


class OccurrenceLabeler(Protocol):
    def label(self, dag: DagArtifact) -> OccurrenceLabelQuerySurface:
        """Attach coarse phase/material labels without changing DAG topology."""


class TerminalLabeler(Protocol):
    def label(self, ingested_corpus: IngestedCorpus) -> TerminalLabelQuerySurface:
        """Attach W/D/L labels and terminal anchors to declared terminal occurrences."""


class SalienceBuilder(Protocol):
    def build(
        self,
        ingested_corpus: IngestedCorpus,
        repeated_state_query_surface: RepeatedStateQuerySurface,
        dag: DagArtifact,
        labels: OccurrenceLabelQuerySurface,
        terminal_labels: TerminalLabelQuerySurface,
    ) -> SalienceQuerySurface:
        """Build normalized salience scores and runtime priority hints."""


class EmbeddingBuilder(Protocol):
    def build(
        self,
        ingested_corpus: IngestedCorpus,
        repeated_state_query_surface: RepeatedStateQuerySurface,
        dag: DagArtifact,
        labels: OccurrenceLabelQuerySurface,
        terminal_labels: TerminalLabelQuerySurface,
    ) -> EmbeddingArtifact:
        """Build deterministic coarse coordinates usable as a navigation basis."""