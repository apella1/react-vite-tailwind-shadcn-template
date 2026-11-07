import type { ReviewDto } from "@/types/reviews";

export async function fetchReview(gameId: string): Promise<ReviewDto | null> {
  const res = await fetch(`/api/games/${gameId}/review`);
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Failed to fetch review: ${res.status}`);
  return res.json() as Promise<ReviewDto>;
}

export async function regenerateReview(gameId: string): Promise<void> {
  const res = await fetch(`/api/games/${gameId}/review/regenerate`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to enqueue review: ${res.status}`);
}
