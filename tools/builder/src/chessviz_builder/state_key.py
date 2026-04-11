"""Canonical state-key generation for board-state identity."""

from __future__ import annotations

import chess

from .contracts import StateKeyComponents


class CanonicalStateKeyProvider:
    """Derive a reproducible state key from board-only information."""

    def components_for_board(self, board: chess.Board) -> StateKeyComponents:
        return StateKeyComponents(
            board_fen=board.board_fen(),
            turn="w" if board.turn else "b",
            castling=board.castling_xfen(),
            legal_en_passant=self._legal_en_passant(board),
        )

    def key_for_board(self, board: chess.Board) -> str:
        return self.components_for_board(board).canonical_key

    def _legal_en_passant(self, board: chess.Board) -> str:
        if not board.has_legal_en_passant() or board.ep_square is None:
            return "-"

        return chess.square_name(board.ep_square)