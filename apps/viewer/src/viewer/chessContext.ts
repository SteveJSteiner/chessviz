import type {
  BuilderMoveFactRecord,
  BuilderMoveFamilyRecord,
  RuntimeOccurrenceLine,
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

export function formatOccurrenceLine(line: RuntimeOccurrenceLine | null | undefined) {
  if (!line || line.moves.length === 0) {
    return 'Initial position';
  }

  return line.moves.reduce((notation, move) => {
    const moveText = move.san ?? move.uci;
    const moveNumber = Math.ceil(move.ply / 2);

    if ((move.ply % 2) === 1) {
      const prefix = notation ? ' ' : '';
      return `${notation}${prefix}${moveNumber}. ${moveText}`;
    }

    return `${notation} ${moveText}`;
  }, '').trim();
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
  rootGameId: string,
  line: RuntimeOccurrenceLine | null | undefined,
  ply: number
) {
  const lineText = formatOccurrenceLine(line);
  return `${formatGameName(rootGameId)} · ply ${ply} · ${lineText}`;
}

export function formatGameName(rootGameId: string) {
  if (rootGameId === 'scholars-mate-white') {
    return 'Scholar\'s Mate';
  }
  if (rootGameId === 'fools-mate-black') {
    return 'Fool\'s Mate';
  }
  if (rootGameId === 'repetition-draw') {
    return 'Repetition Draw';
  }
  if (rootGameId === 'qgd-bogo-a') {
    return 'QGD Bogo-Indian A';
  }
  if (rootGameId === 'qgd-bogo-b') {
    return 'QGD Bogo-Indian B';
  }

  return rootGameId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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