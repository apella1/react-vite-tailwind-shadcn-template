export interface JobSummary {
  pending: number;
  running: number;
  done: number;
  failed: number;
  byKind: Record<string, Record<string, number>>;
}

export interface JobSummaryResponse {
  total: JobSummary;
}
