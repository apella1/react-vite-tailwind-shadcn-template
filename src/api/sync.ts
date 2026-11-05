import type { SyncProgress, SyncResponse } from "@/types/sync";

export async function startSync(username: string): Promise<SyncResponse> {
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
  return res.json() as Promise<SyncResponse>;
}

export async function fetchSyncProgress(syncId: string): Promise<SyncProgress> {
  const res = await fetch(`/api/sync/${syncId}`);
  if (!res.ok) throw new Error(`Failed to fetch sync progress: ${res.status}`);
  return res.json() as Promise<SyncProgress>;
}
