import assert from 'node:assert/strict';
import test from 'node:test';
import { listBoardSquares, parseStateKey } from './chessContext.ts';

test('parses canonical four-field state keys into a full 64-square board', () => {
  const parsedStateKey = parseStateKey(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -'
  );
  const squares = listBoardSquares(parsedStateKey);

  assert.equal(parsedStateKey.board.length, 8);
  assert.equal(squares.length, 64);
  assert.equal(parsedStateKey.activeColor, 'white');
  assert.equal(parsedStateKey.castling, 'KQkq');
  assert.equal(parsedStateKey.enPassant, '-');
  assert.equal(squares[0]?.algebraic, 'a8');
  assert.equal(squares[0]?.piece?.code, 'r');
  assert.equal(squares[63]?.algebraic, 'h1');
  assert.equal(squares[63]?.piece?.code, 'R');
});

test('accepts full six-field FEN so arbitrary legal positions can be rendered', () => {
  const parsedStateKey = parseStateKey(
    'r3k2r/ppp2ppp/2n5/3pP3/3P4/2N5/PPP2PPP/R3K2R b KQkq d3 14 23'
  );
  const squares = listBoardSquares(parsedStateKey);
  const d5Square = squares.find((square) => square.algebraic === 'd5');
  const e5Square = squares.find((square) => square.algebraic === 'e5');

  assert.equal(parsedStateKey.activeColor, 'black');
  assert.equal(parsedStateKey.castling, 'KQkq');
  assert.equal(parsedStateKey.enPassant, 'd3');
  assert.equal(d5Square?.piece?.code, 'p');
  assert.equal(e5Square?.piece?.code, 'P');
});

test('supports sparse and promotion-heavy boards without inventing filler structure', () => {
  const parsedStateKey = parseStateKey(
    '4k3/2Q5/8/8/8/8/5q2/4K3 w - - 0 1'
  );
  const squares = listBoardSquares(parsedStateKey);
  const c7Square = squares.find((square) => square.algebraic === 'c7');
  const f2Square = squares.find((square) => square.algebraic === 'f2');

  assert.equal(c7Square?.piece?.code, 'Q');
  assert.equal(f2Square?.piece?.code, 'q');
  assert.equal(
    squares.filter((square) => square.piece !== null).length,
    4
  );
});

test('fails fast on malformed board geometry instead of rendering a broken grid', () => {
  assert.throws(
    () => parseStateKey('8/8/8/8/8/8/8 w - -'),
    /must contain 8 ranks/
  );
  assert.throws(
    () => parseStateKey('9/8/8/8/8/8/8/8 w - -'),
    /overflows 8 files/
  );
  assert.throws(
    () => parseStateKey('8/8/8/8/8/8/8/X7 w - -'),
    /invalid piece code/
  );
});