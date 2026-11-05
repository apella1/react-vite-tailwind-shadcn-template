export interface GameSummary {
  id: string;
  playedAt: string | null;
  timeClass: string | null;
  timeControl: string | null;
  userColor: string | null;
  result: string | null;
  userRating: number | null;
  oppRating: number | null;
  oppUsername: string | null;
  eco: string | null;
  openingName: string | null;
  analysisStatus: string;
}

export interface GameDetail extends GameSummary {
  termination: string | null;
  pgn: string;
}

export interface PagedGames {
  content: GameSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface GameUploadResponse {
  imported: number;
  skipped: number;
  message: string;
}

export interface GamesFilters {
  result?: string;
  color?: string;
  timeClass?: string;
  page?: number;
  size?: number;
}
