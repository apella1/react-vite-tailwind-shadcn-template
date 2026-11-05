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

  const positions = useMemo(() => {
    if (!gameQuery.data?.pgn) return [];
    try {
      const chess = new Chess();
      chess.loadPgn(gameQuery.data.pgn);
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
  }, [gameQuery.data?.pgn]);

  const movePairs = useMemo(() => {
    if (!gameQuery.data?.pgn) return [];
    try {
      const chess = new Chess();
      chess.loadPgn(gameQuery.data.pgn);
      const history = chess.history();
      const pairs: { num: number; white?: string; black?: string }[] = [];
      for (let i = 0; i < history.length; i += 2) {
        pairs.push({
          num: Math.floor(i / 2) + 1,
          white: history[i],
          black: history[i + 1],
        });
      }
      return pairs;
    } catch {
      return [];
    }
  }, [gameQuery.data?.pgn]);

  const game = gameQuery.data;
  const loading = gameQuery.isLoading;
  const error = gameQuery.isError;

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading game…</div>;
  if (error) return <div className="p-8 text-sm text-red-600">Error loading game.</div>;
  if (!game) return null;

  const totalMoves = positions.length - 1;
  const currentFen = positions[currentMove] ?? positions[0];

  const goFirst = () => setCurrentMove(0);
  const goPrev = () => setCurrentMove((m) => Math.max(0, m - 1));
  const goNext = () => setCurrentMove((m) => Math.min(totalMoves, m + 1));
  const goLast = () => setCurrentMove(totalMoves);

  const resultIcon = game.result === "win" ? "🏆" : game.result === "loss" ? "💀" : "🤝";
  const resultLabel = game.result === "win" ? "Won" : game.result === "loss" ? "Lost" : "Draw";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Back link */}
      <button
        onClick={() => navigate("/games")}
        className="mb-4 text-sm text-muted-foreground transition hover:text-foreground"
      >
        ← Games
      </button>

      {/* Game info header */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{resultIcon}</span>
          <span className="font-semibold">{resultLabel}</span>
          <span className="text-muted-foreground">
            {game.userColor === "white" ? "as White" : "as Black"}
          </span>
        </div>
        <span className="text-muted-foreground">vs</span>
        <span className="font-medium">{game.oppUsername ?? "Unknown"}</span>
        <span className="text-sm text-muted-foreground">
          {game.userRating ?? "?"} vs {game.oppRating ?? "?"}
        </span>
        <span className="text-sm text-muted-foreground">
          {game.playedAt ? new Date(game.playedAt).toLocaleDateString(undefined, {
            month: "short", day: "numeric", year: "numeric",
          }) : "—"}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{game.timeClass ?? "—"}</span>
      </div>

      {/* Opening info */}
      {game.openingName && (
        <p className="mb-4 text-sm text-muted-foreground">
          {game.eco ? `[${game.eco}] ` : ""}{game.openingName}
        </p>
      )}
      {game.termination && (
        <p className="mb-4 text-xs text-muted-foreground">{game.termination}</p>
      )}

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
              <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground">
                {currentMove} / {totalMoves}
              </span>
              <button onClick={goNext} disabled={currentMove === totalMoves}
                className="rounded border px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-20">▶</button>
              <button onClick={goLast} disabled={currentMove === totalMoves}
                className="rounded border px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-20">⏭</button>
            </div>

            {/* Theme selector inline */}
            <div className="mt-4 flex justify-center border-t pt-3">
              <ThemeSelector />
            </div>
          </div>
        </div>

        {/* Move list */}
        <div className="md:w-64">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Moves</h2>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
            {movePairs.map((pair) => {
              const whiteIdx = (pair.num - 1) * 2 + 1;
              const blackIdx = whiteIdx + 1;
              return (
                <div key={pair.num} className="flex border-b last:border-0">
                  <span className="w-8 py-1.5 px-2 text-xs text-muted-foreground">{pair.num}.</span>
                  <button
                    onClick={() => setCurrentMove(whiteIdx)}
                    className={`flex-1 py-1.5 px-2 text-left text-sm transition hover:bg-muted ${
                      currentMove === whiteIdx ? "bg-primary/10 font-medium" : ""
                    }`}
                  >
                    {pair.white}
                  </button>
                  <button
                    onClick={() => pair.black && setCurrentMove(blackIdx)}
                    className={`flex-1 py-1.5 px-2 text-left text-sm transition hover:bg-muted ${
                      currentMove === blackIdx ? "bg-primary/10 font-medium" : ""
                    }`}
                  >
                    {pair.black ?? ""}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
