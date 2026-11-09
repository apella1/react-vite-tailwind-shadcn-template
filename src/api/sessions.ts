import type { DailyQueueResponse, PracticeSessionDto, RecordSessionRequest } from "@/types/sessions";
import type { TrendsResponse } from "@/types/stats";

export async function fetchTodayQueue(username: string): Promise<DailyQueueResponse> {
  const res = await fetch(`/api/sessions/today?username=${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error(`Failed to fetch today's queue: ${res.status}`);
  return res.json() as Promise<DailyQueueResponse>;
}

export async function recordSession(username: string, request: RecordSessionRequest): Promise<PracticeSessionDto> {
  const res = await fetch(`/api/sessions?username=${encodeURIComponent(username)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Failed to record session: ${res.status}`);
  return res.json() as Promise<PracticeSessionDto>;
}

export async function fetchRecentSessions(username: string): Promise<PracticeSessionDto[]> {
  const res = await fetch(`/api/sessions?username=${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`);
  return res.json() as Promise<PracticeSessionDto[]>;
}

export async function fetchTrends(username: string, periods = 6): Promise<TrendsResponse> {
  const res = await fetch(`/api/stats/trends?username=${encodeURIComponent(username)}&periods=${periods}`);
  if (!res.ok) throw new Error(`Failed to fetch trends: ${res.status}`);
  return res.json() as Promise<TrendsResponse>;
}
