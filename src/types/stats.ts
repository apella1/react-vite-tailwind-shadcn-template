export interface WeaknessEntry {
  type: string;
  count: number;
  ratePerHundred: number;
  phases: Record<string, number>;
}

export interface WeaknessesResponse {
  username: string;
  totalUserMoves: number;
  analyzedGames: number;
  weaknesses: WeaknessEntry[];
}
