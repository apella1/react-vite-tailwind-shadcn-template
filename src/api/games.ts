import type { GameDetail, GameUploadResponse, GamesFilters, PagedGames } from "@/types/games";

const BASE = "/api/games";

export async function fetchGames(username: string, filters: GamesFilters = {}): Promise<PagedGames> {
  const params = new URLSearchParams({ username });
  if (filters.result) params.set("result", filters.result);
  if (filters.color) params.set("color", filters.color);
  if (filters.timeClass) params.set("timeClass", filters.timeClass);
  if (filters.page != null) params.set("page", String(filters.page));
  if (filters.size != null) params.set("size", String(filters.size));

  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch games: ${res.status}`);
  return res.json() as Promise<PagedGames>;
}

export async function fetchGame(id: string): Promise<GameDetail> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch game: ${res.status}`);
  return res.json() as Promise<GameDetail>;
}

export async function uploadPgn(username: string, file: File): Promise<GameUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE}/upload?username=${encodeURIComponent(username)}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json() as Promise<GameUploadResponse>;
}
