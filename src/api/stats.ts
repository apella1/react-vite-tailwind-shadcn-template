import type { WeaknessesResponse } from "@/types/stats";

export async function fetchWeaknesses(username: string): Promise<WeaknessesResponse> {
  const res = await fetch(`/api/stats/weaknesses?username=${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error(`Failed to fetch weaknesses: ${res.status}`);
  return res.json() as Promise<WeaknessesResponse>;
}
