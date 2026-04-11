"""Declared corpus ingestion into continuous occurrence paths."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import chess

from .config import find_repository_root
from .contracts import (
    CorpusDeclaration,
    IngestedCorpus,
    IngestedGame,
    OccurrenceIdentityProvider,
    OccurrenceRecord,
    OccurrenceTransition,
    StateKeyProvider,
)

INITIAL_CORPUS_DECLARATION = CorpusDeclaration(
    source_name="initial-represented-subset",
    version="2026-04-11-fixture-001",
    location="tools/builder/fixtures/initial_corpus.json",
)


@dataclass(frozen=True)
class DeclaredGameFixture:
    game_id: str
    moves_san: tuple[str, ...]


@dataclass(frozen=True)
class DeclaredCorpusFixture:
    declaration: CorpusDeclaration
    games: tuple[DeclaredGameFixture, ...]


class DeclaredCorpusIngestor:
    def __init__(
        self,
        repository_root: Path,
        state_key_provider: StateKeyProvider,
        identity_provider: OccurrenceIdentityProvider,
    ) -> None:
        self.repository_root = repository_root
        self.state_key_provider = state_key_provider
        self.identity_provider = identity_provider

    def ingest(self, declaration: CorpusDeclaration) -> IngestedCorpus:
        fixture = load_declared_corpus_fixture(self.repository_root, declaration)
        return IngestedCorpus(
            declaration=fixture.declaration,
            games=tuple(self._ingest_game(game) for game in fixture.games),
        )

    def _ingest_game(self, game: DeclaredGameFixture) -> IngestedGame:
        board = chess.Board()
        root_path = (f"game:{game.game_id}",)
        root_occurrence = self.identity_provider.identify(
            self.state_key_provider.key_for_board(board),
            root_path,
        )

        occurrences: list[OccurrenceRecord] = [root_occurrence]
        transitions: list[OccurrenceTransition] = []
        current_path = root_path

        for ply, san in enumerate(game.moves_san, start=1):
            move = board.parse_san(san)
            parent_occurrence = occurrences[-1]
            board.push(move)
            current_path = (*current_path, f"{ply}:{move.uci()}")
            child_occurrence = self.identity_provider.identify(
                self.state_key_provider.key_for_board(board),
                current_path,
            )
            occurrences.append(child_occurrence)
            transitions.append(
                OccurrenceTransition(
                    parent_occurrence_id=parent_occurrence.occurrence_id,
                    child_occurrence_id=child_occurrence.occurrence_id,
                    move_uci=move.uci(),
                    ply=ply,
                )
            )

        return IngestedGame(
            game_id=game.game_id,
            occurrences=tuple(occurrences),
            transitions=tuple(transitions),
        )


def initial_corpus_declaration() -> CorpusDeclaration:
    return INITIAL_CORPUS_DECLARATION


def load_declared_corpus_fixture(
    repository_root: Path | None = None,
    declaration: CorpusDeclaration = INITIAL_CORPUS_DECLARATION,
) -> DeclaredCorpusFixture:
    resolved_repository_root = repository_root or find_repository_root()
    fixture_path = _resolve_fixture_path(resolved_repository_root, declaration.location)

    with fixture_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    _validate_declaration(payload, declaration)
    games = tuple(
        DeclaredGameFixture(
            game_id=str(game_payload["game_id"]),
            moves_san=tuple(str(move) for move in game_payload["moves_san"]),
        )
        for game_payload in payload["games"]
    )

    return DeclaredCorpusFixture(declaration=declaration, games=games)


def _resolve_fixture_path(repository_root: Path, location: str) -> Path:
    candidate = Path(location)
    return candidate if candidate.is_absolute() else repository_root / candidate


def _validate_declaration(payload: dict[str, object], declaration: CorpusDeclaration) -> None:
    expected = {
        "source_name": declaration.source_name,
        "version": declaration.version,
        "location": declaration.location,
    }
    for key, expected_value in expected.items():
        actual_value = payload.get(key)
        if actual_value != expected_value:
            raise ValueError(
                f"declared corpus fixture mismatch for {key}: "
                f"expected {expected_value!r}, got {actual_value!r}"
            )