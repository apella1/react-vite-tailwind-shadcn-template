export interface DailyQueueResponse {
  username: string;
  puzzleIds: string[];
  dueReviews: number;
  newPuzzles: number;
}

export interface RecordSessionRequest {
  puzzlesTotal: number;
  puzzlesSolved: number;
  focusTypes: string[];
  durationMs: number | null;
}

export interface PracticeSessionDto {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  puzzlesTotal: number;
  puzzlesSolved: number;
  focusTypes: string[];
  durationMs: number | null;
  successRate: number | null;
}
