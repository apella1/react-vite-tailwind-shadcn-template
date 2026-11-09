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

export interface TrendPoint {
  period: string;
  type: string;
  count: number;
  totalMoves: number;
  ratePerHundred: number;
}

export interface TrendsResponse {
  username: string;
  periods: number;
  trends: TrendPoint[];
}
