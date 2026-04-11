"""Occurrence phase/material labeling for builder artifacts."""

from __future__ import annotations

import chess

from .contracts import (
    DagArtifact,
    OccurrenceLabelQuerySurface,
    OccurrenceLabelRecord,
    OccurrenceRecord,
)


FULL_MATERIAL_SIGNATURE = "white[Q1,R2,B2,N2,P8]|black[Q1,R2,B2,N2,P8]"
OPENING_PHASE = "opening"
MIDDLEGAME_PHASE = "middlegame"
ENDGAME_PHASE = "endgame"

_WHITE_MINOR_START_SQUARES = frozenset((chess.B1, chess.G1, chess.C1, chess.F1))
_BLACK_MINOR_START_SQUARES = frozenset((chess.B8, chess.G8, chess.C8, chess.F8))
_MATERIAL_ORDER = (
    (chess.QUEEN, "Q"),
    (chess.ROOK, "R"),
    (chess.BISHOP, "B"),
    (chess.KNIGHT, "N"),
    (chess.PAWN, "P"),
)


class PhaseMaterialOccurrenceLabeler:
    def label(self, dag: DagArtifact) -> OccurrenceLabelQuerySurface:
        return OccurrenceLabelQuerySurface.from_records(
            OccurrenceLabelRecord(
                occurrence_id=node.occurrence_id,
                phase=_classify_phase(node),
                material_signature=_material_signature(node.state_key),
            )
            for node in dag.nodes
        )


def _classify_phase(node: OccurrenceRecord) -> str:
    board = _board_from_state_key(node.state_key)

    if _is_endgame(board):
        return ENDGAME_PHASE

    development_score = _developed_minor_piece_count(
        board,
        chess.WHITE,
        _WHITE_MINOR_START_SQUARES,
    ) + _developed_minor_piece_count(
        board,
        chess.BLACK,
        _BLACK_MINOR_START_SQUARES,
    )
    castled_side_count = _castled_side_count(board)

    if node.ply >= 6 and development_score + castled_side_count >= 3:
        return MIDDLEGAME_PHASE

    return OPENING_PHASE


def _material_signature(state_key: str) -> str:
    board = _board_from_state_key(state_key)
    white_counts = ",".join(_material_count_fragments(board, chess.WHITE))
    black_counts = ",".join(_material_count_fragments(board, chess.BLACK))
    return f"white[{white_counts}]|black[{black_counts}]"


def _material_count_fragments(board: chess.Board, color: chess.Color) -> tuple[str, ...]:
    return tuple(
        f"{symbol}{len(board.pieces(piece_type, color))}"
        for piece_type, symbol in _MATERIAL_ORDER
    )


def _board_from_state_key(state_key: str) -> chess.Board:
    board_fen, turn, castling, legal_en_passant = state_key.split(" ")
    return chess.Board(f"{board_fen} {turn} {castling} {legal_en_passant} 0 1")


def _is_endgame(board: chess.Board) -> bool:
    total_heavy_pieces = sum(
        len(board.pieces(piece_type, chess.WHITE))
        + len(board.pieces(piece_type, chess.BLACK))
        for piece_type in (chess.QUEEN, chess.ROOK)
    )
    total_minor_pieces = sum(
        len(board.pieces(piece_type, chess.WHITE))
        + len(board.pieces(piece_type, chess.BLACK))
        for piece_type in (chess.BISHOP, chess.KNIGHT)
    )
    return total_heavy_pieces <= 2 and total_minor_pieces <= 2


def _developed_minor_piece_count(
    board: chess.Board,
    color: chess.Color,
    start_squares: frozenset[chess.Square],
) -> int:
    developed_piece_count = 0

    for square, piece in board.piece_map().items():
        if piece.color != color:
            continue
        if piece.piece_type not in (chess.KNIGHT, chess.BISHOP):
            continue
        if square in start_squares:
            continue
        developed_piece_count += 1

    return developed_piece_count


def _castled_side_count(board: chess.Board) -> int:
    castled_sides = 0

    if board.king(chess.WHITE) in (chess.G1, chess.C1):
        castled_sides += 1
    if board.king(chess.BLACK) in (chess.G8, chess.C8):
        castled_sides += 1

    return castled_sides