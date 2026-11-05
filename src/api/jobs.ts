import type { JobSummaryResponse } from "@/types/jobs";

export async function fetchJobSummary(): Promise<JobSummaryResponse> {
  const res = await fetch("/api/jobs/summary");
  if (!res.ok) throw new Error(`Failed to fetch job summary: ${res.status}`);
  return res.json() as Promise<JobSummaryResponse>;
}
