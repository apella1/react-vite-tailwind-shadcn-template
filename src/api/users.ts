import type { UserSummary } from "@/types/users";

export async function fetchUsers(): Promise<UserSummary[]> {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
  return res.json() as Promise<UserSummary[]>;
}
