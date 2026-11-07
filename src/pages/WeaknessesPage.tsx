import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchWeaknesses } from "@/api/stats";
import { fetchUsers } from "@/api/users";
import { STORAGE_KEYS } from "@/lib/brand";
import type { WeaknessEntry } from "@/types/stats";

const TYPE_LABELS: Record<string, string> = {
  hanging_piece: "Hanging Piece",
  missed_mate: "Missed Mate",
  missed_check: "Missed Check",
  missed_capture: "Missed Capture",
  missed_fork: "Missed Fork",
  missed_pin: "Missed Pin",
  missed_skewer: "Missed Skewer",
  ignored_threat: "Ignored Threat",
  back_rank: "Back Rank",
  conversion: "Failed Conversion",
  opening_error: "Opening Error",
  other: "Other",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  hanging_piece: "You left a piece undefended after your move",
  missed_mate: "The best move delivered checkmate",
  missed_check: "The best move gave a decisive check",
  missed_capture: "The best move won material; you played a non-capture",
  missed_fork: "The best move attacked two valuable pieces at once",
  missed_pin: "The best move pinned an opponent piece",
  missed_skewer: "The best move skewered a more valuable piece",
  ignored_threat: "Opponent's last move created a threat you didn't address",
  back_rank: "Back rank mating pattern was available",
  conversion: "You had a winning position (>75%) but let it slip",
  opening_error: "Out-of-theory move with significant loss in the opening",
  other: "Tactical mistake without a specific pattern",
};

/** Bar representing rate relative to the worst type */
function RateBar({ rate, maxRate }: { rate: number; maxRate: number }) {
  const pct = maxRate > 0 ? Math.round((rate / maxRate) * 100) : 0;
  const color =
    pct > 66 ? "bg-red-500" : pct > 33 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-muted">
      <div className={`h-full rounded transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function WeaknessCard({ entry, maxRate, onTrainClick }: {
  entry: WeaknessEntry;
  maxRate: number;
  onTrainClick: (type: string) => void;
}) {
  const label = TYPE_LABELS[entry.type] ?? entry.type.replace(/_/g, " ");
  const desc = TYPE_DESCRIPTIONS[entry.type] ?? "";

  return (
    <div className="rounded-lg border p-4 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-semibold capitalize">{label}</span>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
              {entry.ratePerHundred} / 100 moves
            </span>
          </div>
          {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
          <RateBar rate={entry.ratePerHundred} maxRate={maxRate} />
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span>{entry.count} occurrence{entry.count !== 1 ? "s" : ""}</span>
            {Object.entries(entry.phases).map(([phase, cnt]) => (
              <span key={phase} className="capitalize">{phase}: {cnt}</span>
            ))}
          </div>
        </div>
        {entry.type !== "other" && (
          <button
            onClick={() => onTrainClick(entry.type)}
            className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
          >
            🎯 Train
          </button>
        )}
      </div>
    </div>
  );
}

export default function WeaknessesPage() {
  const navigate = useNavigate();
  const storedUsername = localStorage.getItem(STORAGE_KEYS.username) ?? "";
  const [username, setUsername] = useState(storedUsername);

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: fetchUsers, staleTime: 60_000 });

  const weaknessQuery = useQuery({
    queryKey: ["weaknesses", username],
    queryFn: () => fetchWeaknesses(username),
    enabled: username.length > 0,
  });

  const data = weaknessQuery.data;
  const maxRate = data?.weaknesses?.[0]?.ratePerHundred ?? 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Weaknesses</h1>

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

      {weaknessQuery.isLoading && (
        <p className="animate-pulse text-sm text-muted-foreground">Calculating weaknesses…</p>
      )}

      {data && (
        <>
          {/* Summary */}
          <div className="mb-6 flex gap-6 text-sm">
            <div>
              <span className="text-2xl font-bold">{data.analyzedGames}</span>
              <p className="text-muted-foreground">Games analyzed</p>
            </div>
            <div>
              <span className="text-2xl font-bold">{data.totalUserMoves}</span>
              <p className="text-muted-foreground">Your moves</p>
            </div>
            <div>
              <span className="text-2xl font-bold">
                {data.weaknesses.filter((w) => w.type !== "other").length}
              </span>
              <p className="text-muted-foreground">Mistake patterns</p>
            </div>
          </div>

          {data.weaknesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No classified mistakes yet. Sync and analyze more games to see your weakness profile.
            </p>
          ) : (
            <div className="space-y-3">
              {data.weaknesses.map((entry) => (
                <WeaknessCard
                  key={entry.type}
                  entry={entry}
                  maxRate={maxRate}
                  onTrainClick={(type) =>
                    navigate(`/train?theme=${encodeURIComponent(type)}`)
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
