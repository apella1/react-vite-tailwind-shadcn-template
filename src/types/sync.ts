export interface SyncResponse {
  syncId: string;
  username: string;
  status: string;
}

export interface SyncProgress {
  id: string;
  username: string;
  status: string;  // running | done | failed
  archivesTotal: number;
  archivesProcessed: number;
  gamesFound: number;
  newGames: number;
  error: string | null;
}
