import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { fetchGame } from "@/api/games";
import { useTheme } from "@/hooks/useTheme";
import { getBoardTheme } from "@/lib/theme";
import { symbolPieces } from "@/components/chess-pieces";

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentMove, setCurrentMove] = useState(0);

  const gameQuery = useQuery({
    queryKey: ["game", id],
    queryFn: () => fetchGame(id!),
    enabled: !!id,
  });

  // Parse the PGN with chess.js and build a list of positions
  const positions = useMemo(() => {
    if (!gameQuery.data?.pgn) return [];
    try {
      const chess = new Chess();
      chess.loadPgn(gameQuery.data.pgn);
      const history = chess.history({ verbose: true });
      // Build FEN for each position (starting position + one after each move)
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

  // Parse moves for display
  const movePairs = useMemo(() => {
    if (!gameQuery.data?.pgn) return [];
    try {
      const chess = new Chess();
      chess.loadPgn(gameQuery.data.pgn);
      const history = chess.history();
      // Group into pairs: [1. e4 e5, 2. Nf3 Nc6, ...]
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

  const { settings } = useTheme();
  const boardTheme = getBoardTheme(settings.boardThemeId);
  const pieces = settings.pieceStyleId === "symbol" ? symbolPieces : undefined;

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading game…</div>;
  if (error) return <div className="p-8 text-sm text-red-600">Error loading game.</div>;
  if (!game) return null;

  const totalMoves = positions.length - 1; // excluding initial position
  const currentFen = positions[currentMove] ?? positions[0];

  const goFirst = () => setCurrentMove(0);
  const goPrev = () => setCurrentMove((m) => Math.max(0, m - 1));
  const goNext = () => setCurrentMove((m) => Math.min(totalMoves, m + 1));
  const goLast = () => setCurrentMove(totalMoves);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button
        onClick={() => navigate("/games")}
        className="mb-4 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Games
      </button>

      {/* Game info header */}
      <div className="mb-6 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="font-medium">
            {game.userColor === "white" ? "You (White)" : "You (Black)"} vs {game.oppUsername ?? "?"}
          </span>
          <span className="capitalize">
            {game.result === "win" && "🏆 Won"}
            {game.result === "loss" && "💀 Lost"}
            {game.result === "draw" && "🤝 Draw"}
          </span>
          <span>{game.userRating ?? "?"} vs {game.oppRating ?? "?"}</span>
          <span className="capitalize">{game.timeClass}</span>
          <span>{game.playedAt ? new Date(game.playedAt).toLocaleString() : "—"}</span>
        </div>
        {game.openingName && (
          <p className="mt-2 text-sm text-muted-foreground">
            {game.eco ? `[${game.eco}] ` : ""}{game.openingName}
          </p>
        )}
        {game.termination && (
          <p className="mt-1 text-xs text-muted-foreground">{game.termination}</p>
        )}
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Board */}
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
            <div className="mt-4 flex items-center justify-center gap-2">
              <button onClick={goFirst} disabled={currentMove === 0}
                className="rounded border px-3 py-1 text-sm disabled:opacity-30">⏮</button>
              <button onClick={goPrev} disabled={currentMove === 0}
                className="rounded border px-3 py-1 text-sm disabled:opacity-30">◀</button>
              <span className="px-2 text-sm text-muted-foreground">
                {currentMove} / {totalMoves}
              </span>
              <button onClick={goNext} disabled={currentMove === totalMoves}
                className="rounded border px-3 py-1 text-sm disabled:opacity-30">▶</button>
              <button onClick={goLast} disabled={currentMove === totalMoves}
                className="rounded border px-3 py-1 text-sm disabled:opacity-30">⏭</button>
            </div>
          </div>
        </div>

        {/* Move list */}
        <div className="md:w-64">
          <h2 className="mb-2 text-sm font-semibold">Moves</h2>
          <div className="max-h-96 overflow-y-auto rounded border text-sm">
            {movePairs.map((pair) => {
              const whiteIdx = (pair.num - 1) * 2 + 1;
              const blackIdx = whiteIdx + 1;
              return (
                <div key={pair.num} className="flex border-b hover:bg-muted/30">
                  <span className="w-8 py-1 px-2 text-muted-foreground">{pair.num}.</span>
                  <button
                    onClick={() => setCurrentMove(whiteIdx)}
                    className={`flex-1 py-1 px-2 text-left hover:bg-muted ${currentMove === whiteIdx ? "bg-primary/10 font-medium" : ""}`}
                  >
                    {pair.white}
                  </button>
                  <button
                    onClick={() => pair.black && setCurrentMove(blackIdx)}
                    className={`flex-1 py-1 px-2 text-left hover:bg-muted ${currentMove === blackIdx ? "bg-primary/10 font-medium" : ""}`}
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
