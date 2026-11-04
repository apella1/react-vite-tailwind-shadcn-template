import type { StatusResponse } from "@/types/status";

export async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch("/api/status");
  if (!response.ok) {
    throw new Error(`Status endpoint returned ${response.status}`);
  }
  return response.json() as Promise<StatusResponse>;
}
