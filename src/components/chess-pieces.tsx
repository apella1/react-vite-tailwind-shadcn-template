/**
 * Chess piece renderers for react-chessboard v5.
 *
 * "classic" uses the default react-chessboard pieces (open-source SVG).
 * "symbol" uses Unicode chess characters rendered at a large font size.
 *
 * react-chessboard v5 expects a PieceRenderObject: Record<string, (props?) => JSX.Element>
 * The keys are piece types: "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK".
 */

import type { PieceRenderObject } from "react-chessboard";

const UNICODE_PIECES: Record<string, string> = {
  wP: "♙", wN: "♘", wB: "♗", wR: "♖", wQ: "♕", wK: "♔",
  bP: "♟", bN: "♞", bB: "♝", bR: "♜", bQ: "♛", bK: "♚",
};

const SYMBOL_COLORS: Record<string, string> = {
  w: "#f8fafc",
  b: "#1e293b",
};

/** Symbol pieces — Unicode chess characters with large font. */
export const symbolPieces: PieceRenderObject = Object.fromEntries(
  Object.entries(UNICODE_PIECES).map(([key, char]) => {
    const color = SYMBOL_COLORS[key[0]] ?? "#000";
    return [key, () => (
      <div
        style={{
          fontSize: "3rem",
          lineHeight: 1,
          textAlign: "center",
          color,
          textShadow: color === "#f8fafc" ? "0 1px 2px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.2)",
          userSelect: "none",
        }}
      >
        {char}
      </div>
    )];
  }),
);
