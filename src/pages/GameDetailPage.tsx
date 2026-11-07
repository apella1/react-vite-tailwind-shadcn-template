import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { fetchGame } from "@/api/games";
import { useTheme } from "@/hooks/useTheme";
import { getBoardTheme } from "@/lib/theme";
import { symbolPieces } from "@/components/chess-pieces";
import ThemeSelector from "@/components/ThemeSelector";
import EvalChart from "@/components/EvalChart";
import ReviewPanel from "@/components/ReviewPanel";
import type { MoveWithEval } from "@/types/games";

const CLASSIFICATION_STYLES: Record<string, { bg: string; label: string }> = {
  blunder:     { bg: "bg-red-500",    label: "??" },
  mistake:     { bg: "bg-orange-500", label: "?" },
  inaccuracy:  { bg: "bg-yellow-500", label: "?!" },
  good:        { bg: "bg-green-700",  label: "" },
  best:        { bg: "bg-green-500",  label: "★" },
  book:        { bg: "bg-slate-400",  label: "" },
};

function MoveBadge({ classification }: { classification: string | null }) {
  if (!classification) return null;
  const style = CLASSIFICATION_STYLES[classification];
  if (!style || !style.label) return null;
  return (
    <span className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white ${style.bg}`}>
      {style.label}
    </span>
  );
}

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentMove, setCurrentMove] = useState(0);

  const gameQuery = useQuery({
    queryKey: ["game", id],
    queryFn: () => fetchGame(id!),
    enabled: !!id,
  });

  const { settings } = useTheme();
  const boardTheme = getBoardTheme(settings.boardThemeId);
  const pieces = settings.pieceStyleId === "symbol" ? symbolPieces : undefined;

  const game = gameQuery.data;
  const loading = gameQuery.isLoading;
  const error = gameQuery.isError;

  // Parse PGN for board positions (used when no engine analysis is available)
  const positionsFromPgn = useMemo(() => {
    if (!game?.pgn) return [];
    try {
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      const history = chess.history({ verbose: true });
      const fens: string[] = [new Chess().fen()];
      const replay = new Chess();
      for (const move of history) {
        replay.move(move);
        fens.push(replay.fen());
      }
      return fens;
    } catch {
      return [];
    }
  }, [game?.pgn]);

  // Use engine analysis FENs if available, otherwise fall back to PGN parsing
  const hasAnalysis = game?.analysisStatus === "done" && (game.moves?.length ?? 0) > 0;
  const positions = hasAnalysis
    ? [new Chess().fen(), ...game!.moves.map((m) => m.fenAfter)]
    : positionsFromPgn;

  // Move pairs for the move list
  const movePairs: { num: number; white?: MoveWithEval; black?: MoveWithEval }[] = useMemo(() => {
    if (hasAnalysis) {
      const moves = game!.moves;
      const pairs: { num: number; white?: MoveWithEval; black?: MoveWithEval }[] = [];
      for (let i = 0; i < moves.length; i += 2) {
        pairs.push({
          num: Math.floor(i / 2) + 1,
          white: moves[i],
          black: moves[i + 1],
        });
      }
      return pairs;
    }
    // Fallback: parse from PGN and wrap as minimal MoveWithEval
    if (!game?.pgn) return [];
    try {
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      const history = chess.history();
      const pairs: { num: number; white?: MoveWithEval; black?: MoveWithEval }[] = [];
      for (let i = 0; i < history.length; i += 2) {
        pairs.push({
          num: Math.floor(i / 2) + 1,
          white: history[i] ? { ply: i + 1, color: "white", san: history[i], fenAfter: "", classification: null, winPctBefore: null, winPctAfter: null, winPctLoss: null, bestUci: null, isMistake: false } : undefined,
          black: history[i + 1] ? { ply: i + 2, color: "black", san: history[i + 1], fenAfter: "", classification: null, winPctBefore: null, winPctAfter: null, winPctLoss: null, bestUci: null, isMistake: false } : undefined,
        });
      }
      return pairs;
    } catch {
      return [];
    }
  }, [game, hasAnalysis]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading game…</div>;
  if (error) return <div className="p-8 text-sm text-red-600">Error loading game.</div>;
  if (!game) return null;

  const totalMoves = positions.length - 1;
  const currentFen = positions[currentMove] ?? positions[0];
  const currentMoveData = hasAnalysis ? game.moves[currentMove - 1] : null;

  const goFirst = () => setCurrentMove(0);
  const goPrev = () => setCurrentMove((m) => Math.max(0, m - 1));
  const goNext = () => setCurrentMove((m) => Math.min(totalMoves, m + 1));
  const goLast = () => setCurrentMove(totalMoves);

  const resultIcon = game.result === "win" ? "🏆" : game.result === "loss" ? "💀" : "🤝";
  const resultLabel = game.result === "win" ? "Won" : game.result === "loss" ? "Lost" : "Draw";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button onClick={() => navigate("/games")} className="mb-4 text-sm text-muted-foreground transition hover:text-foreground">
        ← Games
      </button>

      {/* Game info header */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{resultIcon}</span>
          <span className="font-semibold">{resultLabel}</span>
          <span className="text-muted-foreground">{game.userColor === "white" ? "as White" : "as Black"}</span>
        </div>
        <span className="text-muted-foreground">vs</span>
        <span className="font-medium">{game.oppUsername ?? "Unknown"}</span>
        <span className="text-sm text-muted-foreground">{game.userRating ?? "?"} vs {game.oppRating ?? "?"}</span>
        <span className="text-sm text-muted-foreground">
          {game.playedAt ? new Date(game.playedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{game.timeClass ?? "—"}</span>
        {hasAnalysis && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Analyzed</span>
        )}
      </div>

      {game.openingName && (
        <p className="mb-4 text-sm text-muted-foreground">{game.eco ? `[${game.eco}] ` : ""}{game.openingName}</p>
      )}
      {game.termination && <p className="mb-4 text-xs text-muted-foreground">{game.termination}</p>}

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Board column */}
        <div className="flex-1">
          <div className="mx-auto max-w-md">
            <Chessboard options={{
              position: currentFen,
              boardOrientation: game.userColor === "black" ? "black" : "white",
              allowDragging: false,
              darkSquareStyle: { backgroundColor: boardTheme.darkSquare },
              lightSquareStyle: { backgroundColor: boardTheme.lightSquare },
              ...(pieces ? { pieces } : {}),
            }} />

            {/* Navigation */}
            <div className="mt-3 flex items-center justify-center gap-1">
              <button onClick={goFirst} disabled={currentMove === 0}
                className="rounded border px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-20">⏮</button>
              <button onClick={goPrev} disabled={currentMove === 0}
                className="rounded border px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-20">◀</button>
              <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">{currentMove} / {totalMoves}</span>
              <button onClick={goNext} disabled={currentMove === totalMoves}
                className="rounded border px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-20">▶</button>
              <button onClick={goLast} disabled={currentMove === totalMoves}
                className="rounded border px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-20">⏭</button>
            </div>

            {/* Current move info (from engine) */}
            {currentMoveData && (
              <div className="mt-3 rounded-lg border px-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{currentMoveData.ply}. {currentMoveData.san}</span>
                  <MoveBadge classification={currentMoveData.classification} />
                </div>
                {currentMoveData.classification && currentMoveData.classification !== "best" && currentMoveData.classification !== "good" && currentMoveData.classification !== "book" && (
                  <p className="mt-1 text-muted-foreground">
                    Best: <span className="font-mono">{currentMoveData.bestUci}</span> · Loss: {currentMoveData.winPctLoss?.toFixed(1)}%
                  </p>
                )}
              </div>
            )}

            {/* Theme selector */}
            <div className="mt-4 flex justify-center border-t pt-3">
              <ThemeSelector />
            </div>
          </div>
        </div>

        {/* Right column: eval chart + move list + review */}
        <div className="md:w-72">
          {/* Eval chart (only when analysis is done) */}
          {hasAnalysis && <EvalChart moves={game.moves} />}

          {/* Move list */}
          <h2 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Moves</h2>
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
            {hasAnalysis ? (
              movePairs.map((pair) => {
                const whiteIdx = pair.white?.ply ?? 0;
                const blackIdx = pair.black?.ply ?? 0;
                return (
                  <div key={pair.num} className="flex border-b last:border-0">
                    <span className="w-8 py-1.5 px-2 text-xs text-muted-foreground">{pair.num}.</span>
                    <button
                      onClick={() => setCurrentMove(whiteIdx)}
                      className={`flex-1 py-1.5 px-2 text-left text-sm transition hover:bg-muted ${
                        currentMove === whiteIdx ? "bg-primary/10 font-medium" : ""
                      } ${pair.white?.isMistake ? "text-red-600" : ""}`}
                    >
                      {pair.white?.san}{pair.white && <MoveBadge classification={pair.white.classification} />}
                    </button>
                    <button
                      onClick={() => pair.black && setCurrentMove(blackIdx)}
                      className={`flex-1 py-1.5 px-2 text-left text-sm transition hover:bg-muted ${
                        currentMove === blackIdx ? "bg-primary/10 font-medium" : ""
                      } ${pair.black?.isMistake ? "text-red-600" : ""}`}
                    >
                      {pair.black?.san}{pair.black && <MoveBadge classification={pair.black.classification} />}
                    </button>
                  </div>
                );
              })
            ) : (
              movePairs.map((pair) => (
                <div key={pair.num} className="flex border-b last:border-0">
                  <span className="w-8 py-1.5 px-2 text-xs text-muted-foreground">{pair.num}.</span>
                  <button onClick={() => setCurrentMove((pair.num - 1) * 2 + 1)}
                    className={`flex-1 py-1.5 px-2 text-left text-sm transition hover:bg-muted ${currentMove === (pair.num - 1) * 2 + 1 ? "bg-primary/10 font-medium" : ""}`}>
                    {pair.white?.san ?? ""}
                  </button>
                  <button onClick={() => pair.black && setCurrentMove((pair.num - 1) * 2 + 2)}
                    className={`flex-1 py-1.5 px-2 text-left text-sm transition hover:bg-muted ${currentMove === (pair.num - 1) * 2 + 2 ? "bg-primary/10 font-medium" : ""}`}>
                    {pair.black?.san ?? ""}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* AI Review Panel */}
          {id && (
            <div className="mt-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                AI Review
              </h2>
              <ReviewPanel gameId={id} analysisStatus={game.analysisStatus} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
