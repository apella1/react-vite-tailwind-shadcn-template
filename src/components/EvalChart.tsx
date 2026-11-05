import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { MoveWithEval } from "@/types/games";

/**
 * Win probability chart — shows the evaluation from the mover's perspective
 * at each ply. The y-axis is 0-100 (win probability). Drops indicate mistakes.
 *
 * The values are from the mover's perspective, so we flip the sign for
 * alternating plies to show a White-perspective chart (positive = White winning).
 */
export default function EvalChart({ moves }: { moves: MoveWithEval[] }) {
  // Convert mover-perspective win% to White-perspective for display
  // Even plies (Black to move): show 100 - winPctAfter to flip perspective
  const data = moves.map((m) => {
    const wp = m.winPctAfter ?? 50;
    // winPctAfter is from the mover's perspective after the move.
    // For display from White's perspective:
    // - White's moves (odd ply): wp is from White's perspective → use wp
    // - Black's moves (even ply): wp is from Black's perspective → use 100 - wp
    const whitePerspective = m.color === "white" ? wp : 100 - wp;
    return {
      ply: m.ply,
      winPct: Math.round(whitePerspective * 10) / 10,
      san: m.san,
      classification: m.classification,
    };
  });

  return (
    <div className="rounded-lg border p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Win Probability
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <XAxis dataKey="ply" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} ticks={[0, 50, 100]} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="rounded border bg-background px-2 py-1 text-xs shadow">
                  <p>{d.ply}. {d.san}</p>
                  <p className="text-muted-foreground">Win%: {d.winPct}</p>
                  {d.classification && d.classification !== "best" && d.classification !== "good" && (
                    <p className="capitalize text-orange-600">{d.classification}</p>
                  )}
                </div>
              );
            }}
          />
          <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="winPct"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>White winning ←</span>
        <span>→ Black winning</span>
      </div>
    </div>
  );
}
