/**
 * Centralized brand and content constants.
 *
 * All volatile text — app name, tagline, feature descriptions, page titles,
 * localStorage keys — lives here. Change a value in this file and it propagates
 * everywhere. Never hardcode these strings in JSX.
 */

export const APP = {
  /** Short app name shown in nav, landing page, page title */
  name: "Tempo",

  /** One-line value proposition on the landing page */
  tagline: "Train on your own games — not generic puzzles.",

  /** Icon/emoji used in nav and favicon context */
  icon: "♟",

  /** Full page title (shown in browser tab) */
  pageTitle: "Tempo · Chess Trainer",

  /** Meta description for SEO/social */
  metaDescription:
    "Tempo — Train on your own chess games. Import from chess.com, get engine analysis, puzzles from your mistakes, and AI-powered reviews.",
} as const;

export const PAGES = {
  status: {
    title: "System status",
    subtitle: "Service health and connectivity",
  },
} as const;

export const FEATURES = [
  {
    icon: "📥",
    title: "Import",
    desc: "Sync your chess.com games automatically. Incremental sync keeps API calls minimal on re-sync.",
  },
  {
    icon: "🔍",
    title: "Analyze",
    desc: "Stockfish evaluates every move. Win-probability loss classifies blunders, mistakes, and inaccuracies.",
  },
  {
    icon: "🎯",
    title: "Train",
    desc: "Puzzles generated from your own mistakes. Spaced repetition targets your weakest patterns.",
  },
  {
    icon: "🤖",
    title: "AI Reviews",
    desc: "A local LLM writes plain-English coaching reviews for every game, grounded in engine facts.",
  },
  {
    icon: "📊",
    title: "Weakness Profile",
    desc: "Mistakes classified by type and tracked over time so you know what to work on.",
  },
] as const;

export const STORAGE_KEYS = {
  username: "tempo-username",
  theme: "tempo-theme",
  themeEvent: "tempo-theme-change",
} as const;
