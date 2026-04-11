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
    MoveFactRecord,
    OccurrenceIdentityProvider,
    OccurrenceRecord,
    OccurrenceTransition,
    StateKeyProvider,
)

INITIAL_CORPUS_DECLARATION = CorpusDeclaration(
    source_name="initial-represented-subset",
    version="2026-04-11-fixture-002",
    location="tools/builder/fixtures/initial_corpus.json",
)

TERMINAL_OUTCOME_CLASSES = frozenset(("white-win", "draw", "black-win"))


@dataclass(frozen=True)
class DeclaredGameFixture:
    game_id: str
    moves_san: tuple[str, ...]
    terminal_outcome: str | None = None


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
            move_facts = build_move_facts(board, move)
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
                    move_facts=move_facts,
                )
            )

        return IngestedGame(
            game_id=game.game_id,
            occurrences=tuple(occurrences),
            transitions=tuple(transitions),
            declared_terminal_outcome=game.terminal_outcome,
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
            terminal_outcome=_optional_terminal_outcome(game_payload),
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


def _optional_terminal_outcome(game_payload: dict[str, object]) -> str | None:
    raw_outcome = game_payload.get("terminal_outcome")
    if raw_outcome is None:
        return None

    normalized_outcome = str(raw_outcome)
    if normalized_outcome not in TERMINAL_OUTCOME_CLASSES:
        raise ValueError(
            "declared corpus fixture has unsupported terminal_outcome: "
            f"{normalized_outcome!r}"
        )

    return normalized_outcome


def build_move_facts(board: chess.Board, move: chess.Move) -> MoveFactRecord:
    normalized_san = board.san(move)
    moving_piece = _piece_name(board.piece_type_at(move.from_square))
    captured_piece = _captured_piece_name(board, move)
    promotion_piece = _piece_name(move.promotion)
    is_capture = board.is_capture(move)
    is_castle = board.is_castling(move)
    is_en_passant = board.is_en_passant(move)

    board_after = board.copy(stack=False)
    board_after.push(move)

    return MoveFactRecord(
        san=normalized_san,
        moving_piece=moving_piece,
        captured_piece=captured_piece,
        promotion_piece=promotion_piece,
        is_capture=is_capture,
        is_check=board_after.is_check(),
        is_checkmate=board_after.is_checkmate(),
        is_castle=is_castle,
        castle_side=_castle_side(move) if is_castle else None,
        is_en_passant=is_en_passant,
    )


def _captured_piece_name(board: chess.Board, move: chess.Move) -> str | None:
    if not board.is_capture(move):
        return None

    if board.is_en_passant(move):
        return chess.piece_name(chess.PAWN)

    return _piece_name(board.piece_type_at(move.to_square))


def _piece_name(piece_type: int | None) -> str | None:
    if piece_type is None:
        return None

    return chess.piece_name(piece_type)


def _castle_side(move: chess.Move) -> str:
    return "kingside" if move.to_square > move.from_square else "queenside"