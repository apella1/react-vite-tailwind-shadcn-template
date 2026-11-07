import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { fetchNextPuzzle, fetchPuzzleSolution, submitAttempt } from "@/api/puzzles";
import { fetchUsers } from "@/api/users";
import { useTheme } from "@/hooks/useTheme";
import { getBoardTheme } from "@/lib/theme";
import { symbolPieces } from "@/components/chess-pieces";
import { STORAGE_KEYS } from "@/lib/brand";

type Status = "idle" | "loading" | "playing" | "solved" | "failed";

export default function TrainPage() {
  const storedUsername = localStorage.getItem(STORAGE_KEYS.username) ?? "";
  const [username, setUsername] = useState(storedUsername);
  const [status, setStatus] = useState<Status>(username ? "loading" : "idle");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintMove, setHintMove] = useState<string | null>(null);
  const [solution, setSolution] = useState<string[] | null>(null);
  const [movesTried, setMovesTried] = useState<string[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const chessRef = useRef<Chess | null>(null);

  const { settings } = useTheme();
  const boardTheme = getBoardTheme(settings.boardThemeId);
  const pieces = settings.pieceStyleId === "symbol" ? symbolPieces : undefined;

  // Synced users (for account picker)
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const puzzleQuery = useQuery({
    queryKey: ["puzzle-next", username],
    queryFn: () => fetchNextPuzzle(username),
    enabled: username.length > 0 && (status === "loading"),
  });

  useEffect(() => {
    if (puzzleQuery.data && status === "loading") {
      chessRef.current = new Chess(puzzleQuery.data.fen);
      setStatus("playing");
      startTimeRef.current = Date.now();
    } else if (puzzleQuery.isFetched && puzzleQuery.data === null && status === "loading") {
      setStatus("idle");
    }
  }, [puzzleQuery.data, puzzleQuery.isFetched, status]);

  const attemptMutation = useMutation({
    mutationFn: (params: { puzzleId: string; solved: boolean; moves: string[]; hints: number; timeMs: number }) =>
      submitAttempt(params.puzzleId, username, {
        solved: params.solved,
        movesTried: params.moves,
        timeMs: params.timeMs,
        hintsUsed: params.hints,
      }),
  });

  const handleSelectUser = (name: string) => {
    setUsername(name);
    localStorage.setItem(STORAGE_KEYS.username, name);
    chessRef.current = null;
    setStatus("loading");
    setHintsUsed(0);
    setHintMove(null);
    setSolution(null);
    setMovesTried([]);
  };

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
    fetchPuzzleSolution(puzzleQuery.data!.id).then((sol) => {
      if (sol.solutionUci.length > 0) {
        setHintMove(sol.solutionUci[0].substring(0, 4));
      }
    });
  };

  const handleCheckMove = (uci: string) => {
    fetchPuzzleSolution(puzzleQuery.data!.id).then((sol) => {
      const correctMove = sol.solutionUci[0];
      const timeMs = Date.now() - startTimeRef.current;
      const correct = uci === correctMove;

      setStatus(correct ? "solved" : "failed");
      setSolution(sol.solutionUci);

      attemptMutation.mutate({
        puzzleId: puzzleQuery.data!.id,
        solved: correct,
        moves: [...movesTried, uci],
        hints: hintsUsed,
        timeMs,
      });
    });
  };

  const users = usersQuery.data ?? [];
  const puzzle = puzzleQuery.data;
  const chess = chessRef.current;

  // Account picker bar — always visible
  const AccountBar = () => (
    <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Account:</span>
      {users.map((u) => (
        <button
          key={u.username}
          onClick={() => handleSelectUser(u.username)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            u.username === username
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
        >
          {u.username} <span className="opacity-60">({u.gameCount})</span>
        </button>
      ))}
    </div>
  );

  // --- Render states ---

  if (status === "idle" && !username) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">Train</h1>
        <AccountBar />
        <p className="text-sm text-muted-foreground">
          Select an account above to start solving puzzles.
        </p>
      </div>
    );
  }

  if (status === "loading" || puzzleQuery.isLoading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">Train</h1>
        <AccountBar />
        <p className="text-sm text-muted-foreground">Loading puzzle…</p>
      </div>
    );
  }

  if (!puzzle || !chess) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">Train</h1>
        <AccountBar />
        <div className="rounded-lg border p-6 text-center">
          <p className="font-medium">No puzzles available for <span className="font-mono">{username}</span></p>
          <p className="mt-2 text-sm text-muted-foreground">
            Make sure you have synced games and they have been analyzed.
            Puzzles are generated automatically after each game is analyzed.
          </p>
        </div>
      </div>
    );
  }

  const currentFen = chess.fen();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Train</h1>
        <span className="text-xs text-muted-foreground">{username}</span>
      </div>

      <AccountBar />

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Board */}
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
                    [hintMove.substring(2, 4)]: { backgroundColor: "rgba(59, 130, 246, 0.25)" },
                  },
                } : {}),
              }}
            />
          </div>
        </div>

        {/* Side panel */}
        <div className="md:w-64">
          {status === "playing" && (
            <div className="mb-4 rounded-lg border p-4">
              <p className="font-medium capitalize">{puzzle.sideToMove} to move</p>
              <p className="mt-1 text-xs text-muted-foreground">Find the best move</p>
              {puzzle.themes.filter(t => !["other"].includes(t)).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {puzzle.themes.filter(t => t !== "other").map((t) => (
                    <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {status === "solved" && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-700">✓ Solved!</p>
              {solution && (
                <p className="mt-2 text-sm text-green-600">
                  Best: <span className="font-mono">{solution.join(" ")}</span>
                </p>
              )}
            </div>
          )}

          {status === "failed" && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-700">✗ Not quite</p>
              {solution && (
                <p className="mt-2 text-sm text-red-600">
                  Best: <span className="font-mono">{solution.join(" ")}</span>
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {status === "playing" && (
              <button
                onClick={handleHint}
                className="rounded-lg border px-4 py-2 text-sm transition hover:bg-muted"
              >
                💡 Hint ({hintsUsed} used)
              </button>
            )}
            {(status === "solved" || status === "failed") && (
              <button
                onClick={handleNextPuzzle}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Next Puzzle →
              </button>
            )}
          </div>

          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p>From your own games</p>
            <p className="font-mono">{puzzle.fen.substring(0, 30)}…</p>
          </div>
        </div>
      </div>
    </div>
  );
}
