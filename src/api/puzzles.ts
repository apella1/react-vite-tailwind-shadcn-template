import type { AttemptRequest, AttemptResponse, PuzzleDto, PuzzleSolutionDto } from "@/types/puzzles";

export async function fetchNextPuzzle(username: string, theme?: string): Promise<PuzzleDto | null> {
  const params = new URLSearchParams({ username });
  if (theme) params.set("theme", theme);
  const res = await fetch(`/api/puzzles/next?${params}`);
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Failed to fetch puzzle: ${res.status}`);
  return res.json() as Promise<PuzzleDto>;
}

export async function fetchPuzzleThemes(username: string): Promise<string[]> {
  const res = await fetch(`/api/puzzles/themes?username=${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error(`Failed to fetch themes: ${res.status}`);
  return res.json() as Promise<string[]>;
}

export async function fetchPuzzleSolution(puzzleId: string): Promise<PuzzleSolutionDto> {
  const res = await fetch(`/api/puzzles/${puzzleId}/solution`);
  if (!res.ok) throw new Error(`Failed to fetch solution: ${res.status}`);
  return res.json() as Promise<PuzzleSolutionDto>;
}

export async function submitAttempt(
  puzzleId: string,
  username: string,
  attempt: AttemptRequest,
): Promise<AttemptResponse> {
  const res = await fetch(
    `/api/puzzles/${puzzleId}/attempts?username=${encodeURIComponent(username)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attempt),
    },
  );
  if (!res.ok) throw new Error(`Failed to submit attempt: ${res.status}`);
  return res.json() as Promise<AttemptResponse>;
}
