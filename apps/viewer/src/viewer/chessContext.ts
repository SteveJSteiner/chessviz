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
  const [boardPart = '', activeColorPart = 'w', castling = '-', enPassant = '-'] =
    stateKey.split(' ');
  const ranks = boardPart.split('/');

  return {
    board: ranks.map((rank) => expandFenRank(rank)),
    activeColor: activeColorPart === 'b' ? 'black' : 'white',
    castling,
    enPassant,
    rawBoard: boardPart
  };
}

export function listBoardSquares(parsedStateKey: ParsedStateKey): ParsedBoardSquare[] {
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

function expandFenRank(rank: string): Array<ParsedBoardPiece | null> {
  const squares: Array<ParsedBoardPiece | null> = [];

  for (const character of rank) {
    const emptySquareCount = Number(character);
    if (Number.isInteger(emptySquareCount) && emptySquareCount > 0) {
      for (let index = 0; index < emptySquareCount; index += 1) {
        squares.push(null);
      }
      continue;
    }

    squares.push({
      code: character,
      color: character === character.toUpperCase() ? 'white' : 'black'
    });
  }

  while (squares.length < 8) {
    squares.push(null);
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