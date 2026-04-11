import {
  formatCastlingRights,
  formatTurnLabel,
  listBoardSquares,
  pieceGlyph,
  type ParsedStateKey
} from './chessContext.ts';

type ChessBoardProps = {
  parsedStateKey: ParsedStateKey;
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

const frameStyle = {
  borderRadius: '1rem',
  background: '#f7f1e6',
  border: '1px solid rgba(53, 42, 30, 0.12)',
  overflow: 'hidden'
} as const;

const headerStyle = {
  padding: '0.75rem 0.85rem 0.5rem'
} as const;

const boardStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
  width: '100%',
  aspectRatio: '1 / 1'
} as const;

const footerStyle = {
  display: 'grid',
  gap: '0.2rem',
  padding: '0.55rem 0.85rem 0.85rem',
  fontSize: '0.77rem',
  color: '#5f5547'
} as const;

export function ChessBoard({
  parsedStateKey,
  title,
  subtitle,
  compact = false
}: ChessBoardProps) {
  const squares = listBoardSquares(parsedStateKey);
  const pieceFontSize = compact ? '1rem' : '1.25rem';

  return (
    <article style={frameStyle}>
      {title || subtitle ? (
        <header style={headerStyle}>
          {title ? (
            <div style={{ fontWeight: 700, fontSize: compact ? '0.82rem' : '0.95rem' }}>
              {title}
            </div>
          ) : null}
          {subtitle ? (
            <div style={{ color: '#6d6356', fontSize: compact ? '0.72rem' : '0.82rem' }}>
              {subtitle}
            </div>
          ) : null}
        </header>
      ) : null}
      <div style={boardStyle}>
        {squares.map((square) => (
          <div
            key={square.algebraic}
            style={{
              alignItems: 'center',
              background:
                square.squareColor === 'light' ? '#f2dfc2' : '#9c7552',
              color:
                square.piece?.color === 'white' ? '#f0e6d0' : '#2f241b',
              display: 'flex',
              fontSize: pieceFontSize,
              fontWeight: 700,
              justifyContent: 'center',
              position: 'relative',
              textShadow:
                square.piece?.color === 'white'
                  ? '0 0 1px rgba(44, 32, 22, 0.72), 0 1px 2px rgba(44, 32, 22, 0.58)'
                  : '0 1px 0 rgba(255, 248, 235, 0.28)'
            }}
            title={square.algebraic}
          >
            {square.fileIndex === 0 ? (
              <span
                style={{
                  color: square.squareColor === 'light' ? '#92714e' : '#f0dec5',
                  fontSize: compact ? '0.48rem' : '0.56rem',
                  left: compact ? '0.16rem' : '0.22rem',
                  position: 'absolute',
                  top: compact ? '0.12rem' : '0.18rem'
                }}
              >
                {8 - square.rankIndex}
              </span>
            ) : null}
            {square.rankIndex === 7 ? (
              <span
                style={{
                  bottom: compact ? '0.12rem' : '0.18rem',
                  color: square.squareColor === 'light' ? '#92714e' : '#f0dec5',
                  fontSize: compact ? '0.48rem' : '0.56rem',
                  position: 'absolute',
                  right: compact ? '0.18rem' : '0.24rem'
                }}
              >
                {square.algebraic[0]}
              </span>
            ) : null}
            {square.piece ? pieceGlyph(square.piece.code) : ''}
          </div>
        ))}
      </div>
      <footer style={footerStyle}>
        <div>{formatTurnLabel(parsedStateKey.activeColor)}</div>
        <div>Castling: {formatCastlingRights(parsedStateKey.castling)}</div>
        <div>En passant: {parsedStateKey.enPassant}</div>
      </footer>
    </article>
  );
}