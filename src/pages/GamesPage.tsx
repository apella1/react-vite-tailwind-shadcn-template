import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchGames } from "@/api/games";
import { startSync, fetchSyncProgress } from "@/api/sync";
import { POLLING } from "@/lib/polling";
import type { GameSummary, PagedGames } from "@/types/games";
import type { SyncProgress } from "@/types/sync";

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return <span className="text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    win: "text-green-600 font-semibold",
    loss: "text-red-600 font-semibold",
    draw: "text-yellow-600 font-semibold",
  };
  return <span className={styles[result] ?? ""}>{result}</span>;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function SyncProgressDisplay({ progress }: { progress: SyncProgress }) {
  const pct = progress.archivesTotal > 0
    ? Math.round((progress.archivesProcessed / progress.archivesTotal) * 100)
    : 0;
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-blue-900">
          Syncing {progress.username}…
          {progress.status === "done" && " ✓ Done"}
          {progress.status === "failed" && " ✗ Failed"}
        </span>
        <span className="text-blue-700">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded bg-blue-100">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-blue-700">
        Archives {progress.archivesProcessed}/{progress.archivesTotal}
        {" · "}Games found: {progress.gamesFound}
        {" · "}New: {progress.newGames}
      </p>
      {progress.status === "failed" && progress.error && (
        <p className="mt-1 text-red-700">{progress.error}</p>
      )}
    </div>
  );
}

export default function GamesPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [syncId, setSyncId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ result: "", color: "", timeClass: "" });

  // Save username to localStorage for the landing page stats
  useEffect(() => {
    if (username.trim()) {
      localStorage.setItem("tempo-username", username.trim());
    }
  }, [username]);

  const gamesQuery = useQuery({
    queryKey: ["games", username, filters],
    queryFn: () => fetchGames(username, {
      result: filters.result || undefined,
      color: filters.color || undefined,
      timeClass: filters.timeClass || undefined,
      page: 0,
      size: 20,
    }),
    enabled: username.length > 0,
  });

  const syncMutation = useMutation({
    mutationFn: (name: string) => startSync(name),
    onSuccess: (res) => setSyncId(res.syncId),
  });

  const syncProgressQuery = useQuery({
    queryKey: ["sync-progress", syncId],
    queryFn: () => fetchSyncProgress(syncId!),
    enabled: syncId !== null,
    refetchInterval: (q) => {
      const data = q.state.data;
      return data?.status === "running" ? POLLING.SYNC_PROGRESS : false;
    },
  });

  const handleSync = () => {
    if (!username.trim()) return;
    syncMutation.mutate(username.trim());
  };

  const handleSyncDone = () => {
    setSyncId(null);
    gamesQuery.refetch();
  };

  // Auto-clear sync when done
  if (syncProgressQuery.data?.status === "done" && syncId) {
    setTimeout(handleSyncDone, 2000);
  }

  const games: PagedGames | undefined = gamesQuery.data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Games</h1>

      {/* Sync form */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="chess.com username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <button
          onClick={handleSync}
          disabled={!username.trim() || syncMutation.isPending}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {syncMutation.isPending ? "Starting…" : "Sync Games"}
        </button>
      </div>

      {/* Sync progress */}
      {syncProgressQuery.data && (
        <div className="mb-6">
          <SyncProgressDisplay progress={syncProgressQuery.data} />
        </div>
      )}

      {/* Filters */}
      {username && (
        <div className="mb-4 flex gap-3 text-sm">
          <select
            value={filters.result}
            onChange={(e) => setFilters({ ...filters, result: e.target.value })}
            className="rounded border px-2 py-1"
          >
            <option value="">All results</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="draw">Draws</option>
          </select>
          <select
            value={filters.color}
            onChange={(e) => setFilters({ ...filters, color: e.target.value })}
            className="rounded border px-2 py-1"
          >
            <option value="">All colors</option>
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
          <select
            value={filters.timeClass}
            onChange={(e) => setFilters({ ...filters, timeClass: e.target.value })}
            className="rounded border px-2 py-1"
          >
            <option value="">All time controls</option>
            <option value="rapid">Rapid</option>
            <option value="blitz">Blitz</option>
            <option value="bullet">Bullet</option>
            <option value="daily">Daily</option>
          </select>
        </div>
      )}

      {/* Games list */}
      {gamesQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading games…</p>
      )}

      {gamesQuery.isError && (
        <p className="text-sm text-red-600">Error loading games.</p>
      )}

      {games && games.content.length === 0 && (
        <p className="text-sm text-muted-foreground">No games found. Try syncing.</p>
      )}

      {games && games.content.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Opponent</th>
                <th className="py-2 pr-4">Color</th>
                <th className="py-2 pr-4">Result</th>
                <th className="py-2 pr-4">Opening</th>
                <th className="py-2 pr-4">Type</th>
              </tr>
            </thead>
            <tbody>
              {games.content.map((game: GameSummary) => (
                <tr
                  key={game.id}
                  onClick={() => navigate(`/games/${game.id}`)}
                  className="cursor-pointer border-b hover:bg-muted/50"
                >
                  <td className="py-2 pr-4">{formatDate(game.playedAt)}</td>
                  <td className="py-2 pr-4">{game.oppUsername ?? "—"}</td>
                  <td className="py-2 pr-4 capitalize">{game.userColor ?? "—"}</td>
                  <td className="py-2 pr-4"><ResultBadge result={game.result} /></td>
                  <td className="py-2 pr-4 max-w-48 truncate">{game.openingName ?? "—"}</td>
                  <td className="py-2 pr-4 capitalize">{game.timeClass ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted-foreground">
            {games.totalElements} game(s) total
          </p>
        </div>
      )}
    </div>
  );
}
