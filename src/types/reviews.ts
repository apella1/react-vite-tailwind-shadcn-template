export interface KeyMoment {
  ply: number;
  san: string;
  what_happened: string;
  better_move: string;
  lesson: string;
}

export interface ReviewJson {
  summary: string;
  result_explanation: string;
  key_moments: KeyMoment[];
  strengths: string[];
  habit_to_fix: string;
  practice_suggestion: string;
}

export interface ReviewDto {
  id: string;
  gameId: string;
  model: string;
  promptVersion: string;
  reviewText: string | null;
  reviewJson: ReviewJson | null;
  validationStatus: "ok" | "flagged";
  createdAt: string;
}
