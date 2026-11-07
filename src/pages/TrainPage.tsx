import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { fetchNextPuzzle, fetchPuzzleSolution, submitAttempt } from "@/api/puzzles";
import { useTheme } from "@/hooks/useTheme";
import { getBoardTheme } from "@/lib/theme";
import { symbolPieces } from "@/components/chess-pieces";
import { STORAGE_KEYS } from "@/lib/brand";

type Status = "loading" | "playing" | "solved" | "failed";

export default function TrainPage() {
  const storedUsername = localStorage.getItem(STORAGE_KEYS.username) ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintMove, setHintMove] = useState<string | null>(null);
  const [solution, setSolution] = useState<string[] | null>(null);
  const [movesTried, setMovesTried] = useState<string[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const chessRef = useRef<Chess | null>(null);

  const { settings } = useTheme();
  const boardTheme = getBoardTheme(settings.boardThemeId);
  const pieces = settings.pieceStyleId === "symbol" ? symbolPieces : undefined;

  const puzzleQuery = useQuery({
    queryKey: ["puzzle-next", storedUsername],
    queryFn: () => fetchNextPuzzle(storedUsername),
    enabled: storedUsername.length > 0 && status === "loading",
  });

  useEffect(() => {
    if (puzzleQuery.data && status === "loading") {
      chessRef.current = new Chess(puzzleQuery.data.fen);
      setStatus("playing");
      startTimeRef.current = Date.now();
    }
  }, [puzzleQuery.data, status]);

  const attemptMutation = useMutation({
    mutationFn: (params: { puzzleId: string; solved: boolean; moves: string[]; hints: number; timeMs: number }) =>
      submitAttempt(params.puzzleId, storedUsername, {
        solved: params.solved,
        movesTried: params.moves,
        timeMs: params.timeMs,
        hintsUsed: params.hints,
      }),
  });

  if (!storedUsername) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-muted-foreground">Enter your chess.com username on the Games page first.</p>
      </div>
    );
  }

  if (puzzleQuery.isLoading || status === "loading") {
    return <div className="p-8 text-sm text-muted-foreground">Loading puzzle…</div>;
  }

  if (puzzleQuery.isError || !puzzleQuery.data) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-muted-foreground">No puzzles available. Sync and analyze your games first.</p>
      </div>
    );
  }

  const puzzle = puzzleQuery.data;
  const chess = chessRef.current;
  if (!chess) return null;

  const currentFen = chess.fen();

  const handleNextPuzzle = () => {
    chessRef.current = null;
    setStatus("loading");
    setHintsUsed(0);
    setHintMove(null);
    setSolution(null);
    setMovesTried([]);
    puzzleQuery.refetch();
  };

  const handleHint = () => {
    setHintsUsed((h) => h + 1);
    fetchPuzzleSolution(puzzle.id).then((sol) => {
      if (sol.solutionUci.length > 0) {
        setHintMove(sol.solutionUci[0].substring(0, 4));
      }
    });
  };

  const handleCheckMove = (uci: string) => {
    fetchPuzzleSolution(puzzle.id).then((sol) => {
      const correctMove = sol.solutionUci[0];
      const timeMs = Date.now() - startTimeRef.current;

      if (uci === correctMove) {
        setStatus("solved");
        setSolution(sol.solutionUci);
      } else {
        setStatus("failed");
        setSolution(sol.solutionUci);
      }

      attemptMutation.mutate({
        puzzleId: puzzle.id,
        solved: uci === correctMove,
        moves: [...movesTried, uci],
        hints: hintsUsed,
        timeMs,
      });
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Train</h1>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-1">
          <div className="mx-auto max-w-md">
            <Chessboard
              options={{
                position: currentFen,
                boardOrientation: puzzle.sideToMove === "black" ? "black" : "white",
                darkSquareStyle: { backgroundColor: boardTheme.darkSquare },
                lightSquareStyle: { backgroundColor: boardTheme.lightSquare },
                ...(pieces ? { pieces } : {}),
                onPieceDrop: ({ sourceSquare, targetSquare }) => {
                  if (status !== "playing" || !targetSquare) return false;
                  try {
                    const moveResult = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
                    if (!moveResult) return false;
                    const uci = `${sourceSquare}${targetSquare}`;
                    setMovesTried((m) => [...m, uci]);
                    handleCheckMove(uci);
                    return true;
                  } catch {
                    return false;
                  }
                },
                ...(hintMove ? {
                  squareStyles: {
                    [hintMove.substring(0, 2)]: { backgroundColor: "rgba(59, 130, 246, 0.4)" },
                    [hintMove.substring(2, 4)]: { backgroundColor: "rgba(59, 130, 246, 0.3)" },
                  }
                } : {}),
              }}
            />
          </div>
        </div>

        <div className="md:w-64">
          {status === "playing" && (
            <div className="mb-4">
              <p className="text-sm font-medium capitalize">{puzzle.sideToMove} to move</p>
              <p className="mt-1 text-xs text-muted-foreground">Find the best move</p>
              {puzzle.themes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {puzzle.themes.map((t) => (
                    <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {status === "solved" && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-700">✓ Solved!</p>
              {solution && <p className="mt-1 text-sm text-green-600">Solution: <span className="font-mono">{solution.join(" ")}</span></p>}
            </div>
          )}

          {status === "failed" && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-700">✗ Not quite</p>
              {solution && <p className="mt-1 text-sm text-red-600">Best: <span className="font-mono">{solution.join(" ")}</span></p>}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {status === "playing" && (
              <button onClick={handleHint} className="rounded-lg border px-4 py-2 text-sm transition hover:bg-muted">
                💡 Hint
              </button>
            )}
            {(status === "solved" || status === "failed") && (
              <button onClick={handleNextPuzzle} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
                Next Puzzle →
              </button>
            )}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            From your games · {puzzle.source === "own_game" ? "Own mistake" : "Lichess"}
          </p>
        </div>
      </div>
    </div>
  );
}
