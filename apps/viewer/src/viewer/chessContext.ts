import type {
  BuilderMoveFactRecord,
  BuilderMoveFamilyRecord,
  BuilderOccurrenceRecord,
  Vector3
} from './contracts';

export type ParsedBoardPiece = {
  code: string;
  color: 'white' | 'black';
};

export type ParsedStateKey = {
  board: Array<Array<ParsedBoardPiece | null>>;
  activeColor: 'white' | 'black';
  castling: string;
  enPassant: string;
  rawBoard: string;
};

export type ParsedBoardSquare = {
  fileIndex: number;
  rankIndex: number;
  algebraic: string;
  squareColor: 'light' | 'dark';
  piece: ParsedBoardPiece | null;
};

const FILE_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const BOARD_DIMENSION = 8;
const VALID_PIECE_CODES = new Set(['K', 'Q', 'R', 'B', 'N', 'P', 'k', 'q', 'r', 'b', 'n', 'p']);
const VALID_CASTLING_FIELD = /^(?:-|[KQABCDEFGHkqabcdefgh]+)$/;
const VALID_EN_PASSANT_FIELD = /^(?:-|[a-h][36])$/;
const PIECE_GLYPHS: Record<string, string> = {
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟'
};

export function parseStateKey(stateKey: string): ParsedStateKey {
  const normalizedStateKey = stateKey.trim();

  if (normalizedStateKey.length === 0) {
    throw new Error('state key must not be empty');
  }

  const fields = normalizedStateKey.split(/\s+/);

  if (fields.length !== 4 && fields.length !== 6) {
    throw new Error(
      `state key must contain 4 canonical fields or 6 full FEN fields; received ${fields.length}`
    );
  }

  const [boardPart = '', activeColorPart = 'w', castling = '-', enPassant = '-'] = fields;
  const ranks = boardPart.split('/');

  if (ranks.length !== BOARD_DIMENSION) {
    throw new Error(
      `state key board must contain ${BOARD_DIMENSION} ranks; received ${ranks.length}`
    );
  }

  if (activeColorPart !== 'w' && activeColorPart !== 'b') {
    throw new Error(`state key turn field must be "w" or "b"; received ${activeColorPart}`);
  }

  if (!VALID_CASTLING_FIELD.test(castling)) {
    throw new Error(`state key castling field is invalid: ${castling}`);
  }

  if (!VALID_EN_PASSANT_FIELD.test(enPassant)) {
    throw new Error(`state key en passant field is invalid: ${enPassant}`);
  }

  return {
    board: ranks.map((rank, rankIndex) => expandFenRank(rank, rankIndex)),
    activeColor: activeColorPart === 'b' ? 'black' : 'white',
    castling,
    enPassant,
    rawBoard: boardPart
  };
}

export function listBoardSquares(parsedStateKey: ParsedStateKey): ParsedBoardSquare[] {
  if (
    parsedStateKey.board.length !== BOARD_DIMENSION ||
    parsedStateKey.board.some((rank) => rank.length !== BOARD_DIMENSION)
  ) {
    throw new Error('parsed board must be an 8x8 grid');
  }

  return parsedStateKey.board.flatMap((rank, rankIndex) =>
    rank.map((piece, fileIndex) => ({
      fileIndex,
      rankIndex,
      algebraic: `${FILE_LABELS[fileIndex]}${8 - rankIndex}`,
      squareColor: (fileIndex + rankIndex) % 2 === 0 ? 'light' : 'dark',
      piece
    }))
  );
}

export function pieceGlyph(pieceCode: string) {
  return PIECE_GLYPHS[pieceCode] ?? pieceCode;
}

export function summarizeMoveSemantics(
  moveFacts: BuilderMoveFactRecord,
  moveFamily: BuilderMoveFamilyRecord
) {
  if (moveFacts.isCheckmate) {
    return 'capture checkmate';
  }
  if (moveFacts.isCheck && moveFacts.isCapture) {
    return 'capture with check';
  }
  if (moveFacts.isCheck) {
    return 'checking move';
  }
  if (moveFacts.isCastle) {
    return 'castling move';
  }
  if (moveFamily.interactionClass === 'capture') {
    return 'capture';
  }
  return 'quiet move';
}

export function formatTurnLabel(activeColor: ParsedStateKey['activeColor']) {
  return activeColor === 'white' ? 'White to move' : 'Black to move';
}

export function formatCastlingRights(castling: string) {
  return castling === '-' ? 'none' : castling;
}

export function formatFocusOptionLabel(
  occurrence: BuilderOccurrenceRecord
) {
  const phaseLabel = occurrence.terminal
    ? `Terminal ${formatTerminalOutcomeLabel(occurrence.terminal.wdlLabel)}`
    : capitalizeLabel(occurrence.annotations.phaseLabel);

  return `${phaseLabel} · ply ${occurrence.ply} · ${occurrence.annotations.materialSignature} · ${shortOccurrenceId(occurrence.occurrenceId)}`;
}

export function formatSubtreeLabel(subtreeKey: string) {
  if (subtreeKey === 'root') {
    return 'Initial position';
  }

  const initialMoveLabel = formatInitialMoveLabel(subtreeKey);

  if (initialMoveLabel) {
    return `1. ${initialMoveLabel} subtree`;
  }

  return `${subtreeKey} subtree`;
}

export function formatTerminalOutcomeLabel(wdlLabel: string) {
  if (wdlLabel === 'W') {
    return '1-0';
  }
  if (wdlLabel === 'L') {
    return '0-1';
  }
  if (wdlLabel === 'D') {
    return '1/2-1/2';
  }
  return wdlLabel;
}

export function shortOccurrenceId(occurrenceId: string) {
  return occurrenceId.replace('occ-', '').slice(0, 8);
}

export function midpoint3(left: Vector3, right: Vector3): Vector3 {
  return [
    (left[0] + right[0]) * 0.5,
    (left[1] + right[1]) * 0.5,
    (left[2] + right[2]) * 0.5
  ];
}

function expandFenRank(rank: string, rankIndex: number): Array<ParsedBoardPiece | null> {
  const squares: Array<ParsedBoardPiece | null> = [];

  for (const character of rank) {
    const emptySquareCount = Number(character);
    if (Number.isInteger(emptySquareCount) && emptySquareCount > 0) {
      for (let index = 0; index < emptySquareCount; index += 1) {
        squares.push(null);

        if (squares.length > BOARD_DIMENSION) {
          throw new Error(
            `rank ${BOARD_DIMENSION - rankIndex} overflows ${BOARD_DIMENSION} files`
          );
        }
      }
      continue;
    }

    if (!VALID_PIECE_CODES.has(character)) {
      throw new Error(`rank ${BOARD_DIMENSION - rankIndex} contains invalid piece code ${character}`);
    }

    squares.push({
      code: character,
      color: character === character.toUpperCase() ? 'white' : 'black'
    });

    if (squares.length > BOARD_DIMENSION) {
      throw new Error(
        `rank ${BOARD_DIMENSION - rankIndex} overflows ${BOARD_DIMENSION} files`
      );
    }
  }

  if (squares.length !== BOARD_DIMENSION) {
    throw new Error(
      `rank ${BOARD_DIMENSION - rankIndex} must contain ${BOARD_DIMENSION} files; received ${squares.length}`
    );
  }

  return squares;
}

function capitalizeLabel(label: string) {
  if (label.length === 0) {
    return label;
  }

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatInitialMoveLabel(subtreeKey: string) {
  const match = subtreeKey.match(/^([a-h][1-8])([a-h][1-8])([nbrq])?$/i);

  if (!match) {
    return null;
  }

  const [, rawFromSquare, rawToSquare, rawPromotionPiece] = match;
  const fromSquare = rawFromSquare.toLowerCase();
  const toSquare = rawToSquare.toLowerCase();
  const promotionPiece = rawPromotionPiece?.toUpperCase();

  if (fromSquare === 'e1' && toSquare === 'g1') {
    return 'O-O';
  }
  if (fromSquare === 'e1' && toSquare === 'c1') {
    return 'O-O-O';
  }

  const piecePrefix = initialMovePiecePrefix(fromSquare);

  if (piecePrefix === null) {
    return null;
  }

  if (promotionPiece) {
    return `${piecePrefix}${toSquare}=${promotionPiece}`;
  }

  return `${piecePrefix}${toSquare}`;
}

function initialMovePiecePrefix(fromSquare: string) {
  if (/^[a-h]2$/.test(fromSquare)) {
    return '';
  }

  if (fromSquare === 'b1' || fromSquare === 'g1') {
    return 'N';
  }
  if (fromSquare === 'c1' || fromSquare === 'f1') {
    return 'B';
  }
  if (fromSquare === 'a1' || fromSquare === 'h1') {
    return 'R';
  }
  if (fromSquare === 'd1') {
    return 'Q';
  }
  if (fromSquare === 'e1') {
    return 'K';
  }

  return null;
}