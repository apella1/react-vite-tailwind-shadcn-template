/**
 * Board theme and piece style presets.
 *
 * Board color schemes are chosen to be distinct from major chess platforms:
 * - Chess.com uses green/cream
 * - Lichess uses brown/cream and blue
 * - Chess24 uses dark blue
 *
 * None of our themes overlap with those.
 */

export interface BoardTheme {
  id: string;
  name: string;
  darkSquare: string;
  lightSquare: string;
}

export interface PieceStyle {
  id: string;
  name: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: "forest", name: "Forest", darkSquare: "#1e3a2f", lightSquare: "#d4e4d4" },
  { id: "slate", name: "Slate", darkSquare: "#475569", lightSquare: "#e2e8f0" },
  { id: "ocean", name: "Ocean", darkSquare: "#0d4f5c", lightSquare: "#d1f0f0" },
  { id: "sunset", name: "Sunset", darkSquare: "#a0522d", lightSquare: "#f5e6d3" },
  { id: "mono", name: "Mono", darkSquare: "#2d2d2d", lightSquare: "#c8c8c8" },
];

export const PIECE_STYLES: PieceStyle[] = [
  { id: "classic", name: "Classic" },
  { id: "symbol", name: "Symbol" },
];

const STORAGE_KEY = "tempo-theme";

export interface ThemeSettings {
  boardThemeId: string;
  pieceStyleId: string;
}

export function loadTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { boardThemeId: "forest", pieceStyleId: "classic" };
}

export function saveTheme(settings: ThemeSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}
