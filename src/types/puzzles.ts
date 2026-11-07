export interface PuzzleDto {
  id: string;
  fen: string;
  sideToMove: string;
  solutionLength: number;
  themes: string[];
  source: string;
}

export interface AttemptRequest {
  solved: boolean;
  movesTried: string[];
  timeMs: number | null;
  hintsUsed: number;
}

export interface AttemptResponse {
  id: string;
  puzzleId: string;
  solved: boolean;
  attemptedAt: string;
}

export interface PuzzleSolutionDto {
  puzzleId: string;
  solutionUci: string[];
}
