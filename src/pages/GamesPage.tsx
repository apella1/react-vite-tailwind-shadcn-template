import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchGames } from "@/api/games";
import { startSync, fetchSyncProgress } from "@/api/sync";
import { POLLING } from "@/lib/polling";
import { STORAGE_KEYS } from "@/lib/brand";
import JobProgress from "@/components/JobProgress";
import type { GameSummary, PagedGames } from "@/types/games";
import type { SyncProgress } from "@/types/sync";

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return <span className="text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    win: "bg-green-100 text-green-700 border-green-200",
    loss: "bg-red-100 text-red-700 border-red-200",
    draw: "bg-amber-100 text-amber-700 border-amber-200",
  };
  const labels: Record<string, string> = { win: "Win", loss: "Loss", draw: "Draw" };
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${styles[result] ?? ""}`}>
      {labels[result] ?? result}
    </span>
  );
}

function ColorDot({ color }: { color: string | null }) {
  if (!color) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1 capitalize text-sm">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full border"
        style={{ backgroundColor: color === "white" ? "#f8fafc" : "#1e293b", borderColor: "#94a3b8" }}
      />
      {color}
    </span>
  );
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
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-900 dark:bg-blue-950">
      <div className="flex items-center justify-between">
        <span className="font-medium text-blue-900 dark:text-blue-100">
          Syncing {progress.username}…
          {progress.status === "done" && " ✓ Complete"}
          {progress.status === "failed" && " ✗ Failed"}
        </span>
        <span className="text-blue-700 dark:text-blue-300">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded bg-blue-100 dark:bg-blue-900">
        <div
          className="h-full rounded bg-blue-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-blue-700 dark:text-blue-300">
        <span>Archives {progress.archivesProcessed}/{progress.archivesTotal}</span>
        <span>Games found: {progress.gamesFound}</span>
        <span className="font-semibold">New: {progress.newGames}</span>
      </div>
      {progress.status === "failed" && progress.error && (
        <p className="mt-1 text-xs text-red-600">{progress.error}</p>
      )}
    </div>
  );
}

export default function GamesPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [syncId, setSyncId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ result: "", color: "", timeClass: "" });

  useEffect(() => {
    if (username.trim()) {
      localStorage.setItem(STORAGE_KEYS.username, username.trim());
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

  if (syncProgressQuery.data?.status === "done" && syncId) {
    setTimeout(handleSyncDone, 2000);
  }

  const games: PagedGames | undefined = gamesQuery.data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Games</h1>
        {games && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{games.totalElements} total</span>
            <JobProgress />
          </div>
        )}
      </div>

      {/* Sync form */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="chess.com username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSync()}
          className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={handleSync}
          disabled={!username.trim() || syncMutation.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          {syncMutation.isPending ? "Starting…" : "Sync"}
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
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {[
            { label: "All", value: "" },
            { label: "Wins", value: "win" },
            { label: "Losses", value: "loss" },
            { label: "Draws", value: "draw" },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setFilters({ ...filters, result: r.value })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filters.result === r.value
                  ? "bg-primary text-primary-foreground"
                  : "border hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
          <span className="w-px bg-border" />
          <select
            value={filters.color}
            onChange={(e) => setFilters({ ...filters, color: e.target.value })}
            className="rounded-full border bg-background px-3 py-1 text-xs"
          >
            <option value="">All colors</option>
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
          <select
            value={filters.timeClass}
            onChange={(e) => setFilters({ ...filters, timeClass: e.target.value })}
            className="rounded-full border bg-background px-3 py-1 text-xs"
          >
            <option value="">All types</option>
            <option value="rapid">Rapid</option>
            <option value="blitz">Blitz</option>
            <option value="bullet">Bullet</option>
            <option value="daily">Daily</option>
          </select>
        </div>
      )}

      {/* Games list */}
      {gamesQuery.isLoading && (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading games…</div>
      )}
      {gamesQuery.isError && (
        <div className="py-12 text-center text-sm text-red-600">Error loading games.</div>
      )}
      {games && games.content.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No games found. Enter your chess.com username and sync.
        </div>
      )}

      {games && games.content.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Opponent</th>
                <th className="px-4 py-2.5 font-medium">Color</th>
                <th className="px-4 py-2.5 font-medium">Result</th>
                <th className="px-4 py-2.5 font-medium">Opening</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {games.content.map((game: GameSummary, i: number) => (
                <tr
                  key={game.id}
                  onClick={() => navigate(`/games/${game.id}`)}
                  className={`cursor-pointer border-b transition hover:bg-muted/40 ${
                    i % 2 === 1 ? "bg-muted/20" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(game.playedAt)}</td>
                  <td className="px-4 py-2.5 font-medium">{game.oppUsername ?? "—"}</td>
                  <td className="px-4 py-2.5"><ColorDot color={game.userColor} /></td>
                  <td className="px-4 py-2.5"><ResultBadge result={game.result} /></td>
                  <td className="px-4 py-2.5 max-w-48 truncate text-muted-foreground">
                    {game.openingName ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">{game.timeClass ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
