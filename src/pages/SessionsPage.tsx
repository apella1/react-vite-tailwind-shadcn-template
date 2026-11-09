import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import {
  fetchTodayQueue, recordSession, fetchRecentSessions, fetchTrends,
} from "@/api/sessions";
import { fetchUsers } from "@/api/users";
import { STORAGE_KEYS } from "@/lib/brand";
import type { PracticeSessionDto } from "@/types/sessions";

const TYPE_LABELS: Record<string, string> = {
  hanging_piece: "Hanging Piece",
  missed_fork: "Missed Fork",
  missed_capture: "Missed Capture",
  conversion: "Conversion",
  opening_error: "Opening Error",
  other: "Other",
};

// Colors for the trend chart lines
const TYPE_COLORS: Record<string, string> = {
  hanging_piece: "#ef4444",
  missed_fork: "#f97316",
  missed_capture: "#eab308",
  conversion: "#8b5cf6",
  opening_error: "#06b6d4",
  other: "#94a3b8",
};

export default function SessionsPage() {
  const navigate = useNavigate();
  const storedUsername = localStorage.getItem(STORAGE_KEYS.username) ?? "";
  const [username, setUsername] = useState(storedUsername);
  const [sessionSolved, setSessionSolved] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const sessionStartRef = useRef<number>(Date.now());

  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: fetchUsers, staleTime: 60_000 });

  const queueQuery = useQuery({
    queryKey: ["today-queue", username],
    queryFn: () => fetchTodayQueue(username),
    enabled: username.length > 0,
  });

  const sessionsQuery = useQuery({
    queryKey: ["recent-sessions", username],
    queryFn: () => fetchRecentSessions(username),
    enabled: username.length > 0,
  });

  const trendsQuery = useQuery({
    queryKey: ["trends", username],
    queryFn: () => fetchTrends(username, 6),
    enabled: username.length > 0,
  });

  const recordMutation = useMutation({
    mutationFn: () =>
      recordSession(username, {
        puzzlesTotal: sessionTotal,
        puzzlesSolved: sessionSolved,
        focusTypes: [],
        durationMs: Date.now() - sessionStartRef.current,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-sessions"] });
      setSessionSolved(0);
      setSessionTotal(0);
    },
  });
  void recordMutation; // referenced by future Start Session flow

  const queue = queueQuery.data;

  // Build trend chart data: one row per period with a key per mistake type
  const trendData = (() => {
    const trends = trendsQuery.data?.trends ?? [];
    const periods = [...new Set(trends.map((t) => t.period))].sort();
    return periods.map((period) => {
      const row: Record<string, string | number> = { period };
      trends
        .filter((t) => t.period === period)
        .forEach((t) => { row[t.type] = t.ratePerHundred; });
      return row;
    });
  })();

  const trendTypes = [
    ...new Set(trendsQuery.data?.trends.map((t) => t.type) ?? []),
  ].filter((t) => t !== "other");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Sessions</h1>

      {/* Account picker */}
      {(usersQuery.data?.length ?? 0) > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Account:</span>
          {usersQuery.data!.map((u) => (
            <button key={u.username} onClick={() => setUsername(u.username)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                u.username === username
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}>
              {u.username}
            </button>
          ))}
        </div>
      )}

      {/* Today's queue */}
      {queue && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Today's Practice</h2>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-2xl font-bold">{queue.dueReviews}</span>
              <p className="text-muted-foreground">Due reviews</p>
            </div>
            <div>
              <span className="text-2xl font-bold">{queue.newPuzzles}</span>
              <p className="text-muted-foreground">New puzzles</p>
            </div>
            <div>
              <span className="text-2xl font-bold">{queue.puzzleIds.length}</span>
              <p className="text-muted-foreground">Total queued</p>
            </div>
          </div>

          {queue.puzzleIds.length > 0 && (
            <button
              onClick={() => navigate("/train")}
              className="mt-4 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Start Session → {queue.puzzleIds.length} puzzles
            </button>
          )}
          {queue.puzzleIds.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              All caught up! Come back tomorrow for new reviews.
            </p>
          )}
        </div>
      )}

      {/* Trend chart */}
      {trendData.length > 0 && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Weakness Trends</h2>
          <p className="mb-3 text-xs text-muted-foreground">Mistakes per 100 moves by month</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded border bg-background px-2 py-1.5 text-xs shadow">
                      <p className="font-medium">{label}</p>
                      {payload.map((p) => (
                        <p key={String(p.dataKey)} style={{ color: p.stroke }}>
                          {TYPE_LABELS[p.dataKey as string] ?? p.dataKey}: {p.value}/100
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                formatter={(value) => TYPE_LABELS[value] ?? value}
                wrapperStyle={{ fontSize: 10 }}
              />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              {trendTypes.map((type) => (
                <Line
                  key={type}
                  type="monotone"
                  dataKey={type}
                  stroke={TYPE_COLORS[type] ?? "#94a3b8"}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent sessions */}
      {(sessionsQuery.data?.length ?? 0) > 0 && (
        <div>
          <h2 className="mb-3 font-semibold">Recent Sessions</h2>
          <div className="space-y-2">
            {sessionsQuery.data!.map((s: PracticeSessionDto) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm">
                <div>
                  <span>{new Date(s.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  {s.focusTypes.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground capitalize">
                      {s.focusTypes.join(", ")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span>{s.puzzlesSolved}/{s.puzzlesTotal} solved</span>
                  {s.successRate != null && (
                    <span className={`font-medium ${
                      s.successRate >= 70 ? "text-green-600" :
                      s.successRate >= 50 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {s.successRate}%
                    </span>
                  )}
                  {s.durationMs && (
                    <span className="text-muted-foreground text-xs">
                      {Math.round(s.durationMs / 60000)}m
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
