"""Salience v1 normalization and runtime priority hints."""

from __future__ import annotations

from .contracts import (
    DagArtifact,
    IngestedCorpus,
    OccurrenceLabelQuerySurface,
    RepeatedStateQuerySurface,
    RuntimePriorityHintRecord,
    SalienceConfig,
    SalienceQuerySurface,
    SalienceRecord,
    TerminalLabelQuerySurface,
)

FOREGROUND_PRIORITY = "foreground"
CONTEXT_PRIORITY = "context"
DETAIL_PRIORITY = "detail"

COARSE_ZOOM = "coarse"
MEDIUM_ZOOM = "medium"
CLOSE_ZOOM = "close"

DEFAULT_SALIENCE_CONFIG = SalienceConfig(
    frequency_weight=0.25,
    terminal_pull_weight=0.60,
    centrality_weight=0.15,
    normalization="min-max",
    top_k_frontier=8,
)


class SalienceV1Builder:
    def __init__(self, config: SalienceConfig = DEFAULT_SALIENCE_CONFIG) -> None:
        self.config = config

    def build(
        self,
        ingested_corpus: IngestedCorpus,
        repeated_state_query_surface: RepeatedStateQuerySurface,
        dag: DagArtifact,
        labels: OccurrenceLabelQuerySurface,
        terminal_labels: TerminalLabelQuerySurface,
    ) -> SalienceQuerySurface:
        del labels
        del terminal_labels

        total_game_count = len(ingested_corpus.games)
        occurrence_to_game = {
            occurrence.occurrence_id: game
            for game in ingested_corpus.games
            for occurrence in game.occurrences
        }
        distinct_game_frequency = _distinct_game_frequency(
            repeated_state_query_surface,
            total_game_count,
        )
        max_degree = max(
            (
                dag.in_degree(node.occurrence_id)
                + dag.out_degree(node.occurrence_id)
                for node in dag.nodes
            ),
            default=1,
        )

        raw_records: list[tuple[str, float, float, float, float]] = []
        for node in dag.nodes:
            game = occurrence_to_game[node.occurrence_id]
            frequency_signal = distinct_game_frequency[node.occurrence_id]
            terminal_pull_signal = _terminal_pull_signal(node.ply, game)
            centrality_signal = (
                dag.in_degree(node.occurrence_id) + dag.out_degree(node.occurrence_id)
            ) / max_degree
            raw_score = (
                self.config.frequency_weight * frequency_signal
                + self.config.terminal_pull_weight * terminal_pull_signal
                + self.config.centrality_weight * centrality_signal
            )
            raw_records.append(
                (
                    node.occurrence_id,
                    raw_score,
                    frequency_signal,
                    terminal_pull_signal,
                    centrality_signal,
                )
            )

        ranked_records = sorted(raw_records, key=_salience_sort_key)
        normalized_scores = _normalize_scores(ranked_records)
        salience_records = tuple(
            SalienceRecord(
                occurrence_id=occurrence_id,
                raw_score=raw_score,
                normalized_score=normalized_scores[occurrence_id],
                frequency_signal=frequency_signal,
                terminal_pull_signal=terminal_pull_signal,
                centrality_signal=centrality_signal,
                priority_hint=_priority_hint(
                    occurrence_id,
                    priority_rank=index,
                    normalized_score=normalized_scores[occurrence_id],
                    config=self.config,
                ),
            )
            for index, (
                occurrence_id,
                raw_score,
                frequency_signal,
                terminal_pull_signal,
                centrality_signal,
            ) in enumerate(ranked_records, start=1)
        )

        return SalienceQuerySurface.from_records(salience_records, config=self.config)


def _distinct_game_frequency(
    repeated_state_query_surface: RepeatedStateQuerySurface,
    total_game_count: int,
) -> dict[str, float]:
    frequencies: dict[str, float] = {}

    for relation in repeated_state_query_surface.relations:
        distinct_game_count = len({occurrence.path[0] for occurrence in relation.occurrences})
        normalized_frequency = distinct_game_count / total_game_count if total_game_count else 0.0
        for occurrence in relation.occurrences:
            frequencies[occurrence.occurrence_id] = normalized_frequency

    return frequencies


def _terminal_pull_signal(node_ply: int, game) -> float:
    if game.declared_terminal_outcome is None:
        return 0.0

    total_plies = len(game.transitions)
    if total_plies == 0:
        return 0.0

    return node_ply / total_plies


def _salience_sort_key(record: tuple[str, float, float, float, float]) -> tuple[float, str]:
    occurrence_id, raw_score, _, _, _ = record
    return (-raw_score, occurrence_id)


def _normalize_scores(
    ranked_records: list[tuple[str, float, float, float, float]],
) -> dict[str, float]:
    if not ranked_records:
        return {}

    raw_scores = [record[1] for record in ranked_records]
    min_score = min(raw_scores)
    max_score = max(raw_scores)

    if min_score == max_score:
        return {record[0]: 1.0 for record in ranked_records}

    return {
        occurrence_id: (raw_score - min_score) / (max_score - min_score)
        for occurrence_id, raw_score, _, _, _ in ranked_records
    }


def _priority_hint(
    occurrence_id: str,
    priority_rank: int,
    normalized_score: float,
    config: SalienceConfig,
) -> RuntimePriorityHintRecord:
    if priority_rank <= config.top_k_frontier:
        priority_band = FOREGROUND_PRIORITY
        retain_from_zoom = COARSE_ZOOM
    elif normalized_score >= 0.4:
        priority_band = CONTEXT_PRIORITY
        retain_from_zoom = MEDIUM_ZOOM
    else:
        priority_band = DETAIL_PRIORITY
        retain_from_zoom = CLOSE_ZOOM

    return RuntimePriorityHintRecord(
        occurrence_id=occurrence_id,
        priority_rank=priority_rank,
        priority_band=priority_band,
        retain_from_zoom=retain_from_zoom,
    )