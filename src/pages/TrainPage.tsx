import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { fetchNextPuzzle, fetchPuzzleSolution, fetchPuzzleThemes, submitAttempt } from "@/api/puzzles";
import { fetchUsers } from "@/api/users";
import { useTheme } from "@/hooks/useTheme";
import { getBoardTheme } from "@/lib/theme";
import { symbolPieces } from "@/components/chess-pieces";
import { STORAGE_KEYS } from "@/lib/brand";

type Status = "idle" | "loading" | "playing" | "solved" | "failed";

export default function TrainPage() {
  const storedUsername = localStorage.getItem(STORAGE_KEYS.username) ?? "";
  const [username, setUsername] = useState(storedUsername);
  const [theme, setTheme] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Status>(storedUsername ? "loading" : "idle");
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintSquares, setHintSquares] = useState<Record<string, React.CSSProperties>>({});
  const [solution, setSolution] = useState<string[] | null>(null);
  const [movesTried, setMovesTried] = useState<string[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const chessRef = useRef<Chess | null>(null);

  const { settings } = useTheme();
  const boardTheme = getBoardTheme(settings.boardThemeId);
  const pieces = settings.pieceStyleId === "symbol" ? symbolPieces : undefined;

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: fetchUsers, staleTime: 60_000 });

  const themesQuery = useQuery({
    queryKey: ["puzzle-themes", username],
    queryFn: () => fetchPuzzleThemes(username),
    enabled: username.length > 0,
    staleTime: 30_000,
  });

  const puzzleQuery = useQuery({
    queryKey: ["puzzle-next", username, theme],
    queryFn: () => fetchNextPuzzle(username, theme),
    enabled: username.length > 0 && status === "loading",
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
    mutationFn: (p: { puzzleId: string; solved: boolean; moves: string[]; hints: number; timeMs: number }) =>
      submitAttempt(p.puzzleId, username, {
        solved: p.solved, movesTried: p.moves, timeMs: p.timeMs, hintsUsed: p.hints,
      }),
  });

  const resetPuzzle = () => {
    chessRef.current = null;
    setStatus("loading");
    setHintsUsed(0);
    setHintSquares({});
    setSolution(null);
    setMovesTried([]);
    puzzleQuery.refetch();
  };

  const handleSelectUser = (name: string) => {
    localStorage.setItem(STORAGE_KEYS.username, name);
    setUsername(name);
    setTheme(undefined);
    chessRef.current = null;
    setStatus("loading");
    setHintsUsed(0); setHintSquares({}); setSolution(null); setMovesTried([]);
  };

  const handleSelectTheme = (t: string | undefined) => {
    setTheme(t);
    chessRef.current = null;
    setStatus("loading");
    setHintsUsed(0); setHintSquares({}); setSolution(null); setMovesTried([]);
  };

  const handleHint = () => {
    setHintsUsed((h) => h + 1);
    fetchPuzzleSolution(puzzleQuery.data!.id).then((sol) => {
      if (sol.solutionUci.length > 0) {
        const move = sol.solutionUci[0];
        setHintSquares({
          [move.substring(0, 2)]: { backgroundColor: "rgba(59,130,246,0.45)" },
          [move.substring(2, 4)]: { backgroundColor: "rgba(59,130,246,0.25)" },
        });
      }
    });
  };

  const handleMove = (sourceSquare: string, targetSquare: string) => {
    if (status !== "playing") return false;
    const chess = chessRef.current;
    if (!chess) return false;
    try {
      const result = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!result) return false;
    } catch {
      return false;
    }
    const uci = `${sourceSquare}${targetSquare}`;
    const newMoves = [...movesTried, uci];
    setMovesTried(newMoves);
    setHintSquares({});

    fetchPuzzleSolution(puzzleQuery.data!.id).then((sol) => {
      const correct = uci === sol.solutionUci[0];
      const timeMs = Date.now() - startTimeRef.current;
      setStatus(correct ? "solved" : "failed");
      setSolution(sol.solutionUci);
      attemptMutation.mutate({
        puzzleId: puzzleQuery.data!.id, solved: correct,
        moves: newMoves, hints: hintsUsed, timeMs,
      });
    });
    return true;
  };

  const users = usersQuery.data ?? [];
  const availableThemes = themesQuery.data ?? [];
  const puzzle = puzzleQuery.data;
  const chess = chessRef.current;

  const AccountBar = () => (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground text-xs">Account:</span>
      {users.map((u) => (
        <button key={u.username} onClick={() => handleSelectUser(u.username)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            u.username === username
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}>
          {u.username} <span className="opacity-60">({u.gameCount})</span>
        </button>
      ))}
    </div>
  );

  const ThemeBar = () => {
    if (availableThemes.length === 0) return null;
    // Filter out "other" — not useful as a training filter
    const useful = availableThemes.filter((t) => t !== "other");
    if (useful.length === 0) return null;
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">Theme:</span>
        <button onClick={() => handleSelectTheme(undefined)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            !theme ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}>All</button>
        {useful.map((t) => (
          <button key={t} onClick={() => handleSelectTheme(t)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
              theme === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}>{t.replace(/_/g, " ")}</button>
        ))}
      </div>
    );
  };

  if (status === "idle" && !username) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">Train</h1>
        <AccountBar />
        <p className="text-sm text-muted-foreground">Select an account above to start solving puzzles.</p>
      </div>
    );
  }

  if (status === "loading" || puzzleQuery.isLoading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">Train</h1>
        <AccountBar />
        <ThemeBar />
        <p className="text-sm text-muted-foreground animate-pulse">Loading puzzle…</p>
      </div>
    );
  }

  if (!puzzle || !chess) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-6 text-2xl font-bold">Train</h1>
        <AccountBar />
        <ThemeBar />
        <div className="rounded-lg border p-6 text-center">
          <p className="font-medium">No puzzles{theme ? ` for theme "${theme}"` : ""} for <span className="font-mono">{username}</span></p>
          <p className="mt-2 text-sm text-muted-foreground">
            {theme ? "Try a different theme or " : ""}Games need to be synced and analyzed first.
          </p>
          {theme && (
            <button onClick={() => handleSelectTheme(undefined)} className="mt-3 text-sm text-primary underline-offset-2 hover:underline">
              Show all themes
            </button>
          )}
        </div>
      </div>
    );
  }

  const visibleThemes = puzzle.themes.filter((t) => t !== "other");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Train</h1>
        <span className="text-xs text-muted-foreground">{username}</span>
      </div>

      <AccountBar />
      <ThemeBar />

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Board */}
        <div className="flex-1">
          <div className="mx-auto max-w-md">
            <Chessboard
              options={{
                position: chess.fen(),
                boardOrientation: puzzle.sideToMove === "black" ? "black" : "white",
                darkSquareStyle: { backgroundColor: boardTheme.darkSquare },
                lightSquareStyle: { backgroundColor: boardTheme.lightSquare },
                ...(pieces ? { pieces } : {}),
                squareStyles: hintSquares,
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  handleMove(sourceSquare, targetSquare ?? ""),
              }}
            />
          </div>
        </div>

        {/* Side panel */}
        <div className="md:w-64">
          {status === "playing" && (
            <div className="mb-4 rounded-lg border p-4">
              <p className="font-medium capitalize">{puzzle.sideToMove} to move</p>
              <p className="mt-1 text-xs text-muted-foreground">Drag a piece to make your move</p>
              {visibleThemes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {visibleThemes.map((t) => (
                    <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                      {t.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {status === "solved" && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-700">✓ Correct!</p>
              {solution && <p className="mt-2 font-mono text-sm text-green-600">{solution.join(" ")}</p>}
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
              <button onClick={handleHint}
                className="rounded-lg border px-4 py-2 text-sm transition hover:bg-muted">
                💡 Hint ({hintsUsed} used)
              </button>
            )}
            {(status === "solved" || status === "failed") && (
              <button onClick={resetPuzzle}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
                Next Puzzle →
              </button>
            )}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">From your own games</p>
        </div>
      </div>
    </div>
  );
}
