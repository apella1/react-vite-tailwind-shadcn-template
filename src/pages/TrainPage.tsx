import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { fetchNextPuzzle, fetchPuzzleSolution, fetchPuzzleThemes, submitAttempt } from "@/api/puzzles";
import { fetchUsers } from "@/api/users";
import { useTheme } from "@/hooks/useTheme";
import { getBoardTheme } from "@/lib/theme";
import { symbolPieces } from "@/components/chess-pieces";
import { STORAGE_KEYS } from "@/lib/brand";

type Status = "idle" | "loading" | "playing" | "solved" | "failed";

/** Build the squareStyles overlay: selected piece highlight + valid move dots */
function buildSquareStyles(
  selectedSquare: string | null,
  validMoves: string[],
  hintSquares: Record<string, React.CSSProperties>,
): Record<string, React.CSSProperties> {
  const styles: Record<string, React.CSSProperties> = { ...hintSquares };

  if (selectedSquare) {
    // Highlight selected piece square
    styles[selectedSquare] = { backgroundColor: "rgba(255, 213, 79, 0.6)" };

    // Valid move dots — small circle on empty squares, ring on occupied squares
    for (const sq of validMoves) {
      styles[sq] = {
        background: `radial-gradient(circle, rgba(0,0,0,0.25) 28%, transparent 30%)`,
        borderRadius: "50%",
      };
    }
  }

  return styles;
}

export default function TrainPage() {
  const storedUsername = localStorage.getItem(STORAGE_KEYS.username) ?? "";
  const [searchParams] = useSearchParams();
  const urlTheme = searchParams.get("theme") ?? undefined;
  const [username, setUsername] = useState(storedUsername);
  const [theme, setTheme] = useState<string | undefined>(urlTheme);
  const [status, setStatus] = useState<Status>(storedUsername ? "loading" : "idle");

  // Board state
  const [boardFen, setBoardFen] = useState<string>("start");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [hintSquares, setHintSquares] = useState<Record<string, React.CSSProperties>>({});

  // Attempt tracking
  const [hintsUsed, setHintsUsed] = useState(0);
  const [solution, setSolution] = useState<string[] | null>(null);
  const [movesTried, setMovesTried] = useState<string[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const chessRef = useRef<Chess | null>(null);
  const initialFenRef = useRef<string>("");

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
      const chess = new Chess(puzzleQuery.data.fen);
      chessRef.current = chess;
      initialFenRef.current = chess.fen();
      setBoardFen(chess.fen());
      setSelectedSquare(null);
      setValidMoves([]);
      setHintSquares({});
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

  /** Apply a move (UCI string). Returns true if legal. */
  const applyMove = useCallback((sourceSquare: string, targetSquare: string): boolean => {
    const chess = chessRef.current;
    if (!chess || status !== "playing") return false;
    try {
      const result = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!result) return false;
    } catch {
      return false;
    }

    const uci = `${sourceSquare}${targetSquare}`;
    const newMoves = [...movesTried, uci];
    setMovesTried(newMoves);
    setBoardFen(chess.fen());
    setSelectedSquare(null);
    setValidMoves([]);
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
  }, [status, movesTried, hintsUsed, puzzleQuery.data, attemptMutation]);

  /** Handle drag-and-drop */
  const handlePieceDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    return applyMove(sourceSquare, targetSquare ?? "");
  }, [applyMove]);

  /** Handle click-to-move (chess.com style) */
  const handleSquareClick = useCallback(({ square }: { piece: { pieceType: string } | null; square: string }) => {
    const chess = chessRef.current;
    if (!chess || status !== "playing") return;

    // If a piece is already selected
    if (selectedSquare) {
      // Clicking a valid target square → try to move
      if (validMoves.includes(square)) {
        applyMove(selectedSquare, square);
        return;
      }
      // Clicking the same square → deselect
      if (square === selectedSquare) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }
    }

    // Select the clicked square if it has a piece of the right colour
    const boardPiece = chess.get(square as any);
    if (!boardPiece) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    const sideToMove = chess.turn() === "w" ? "white" : "black";
    const pieceColor = boardPiece.color === "w" ? "white" : "black";
    if (pieceColor !== sideToMove) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // Highlight valid moves for this piece
    const moves = chess.moves({ square: square as any, verbose: true });
    setSelectedSquare(square);
    setValidMoves(moves.map((m: any) => m.to));
  }, [status, selectedSquare, validMoves, applyMove]);

  /** Restart the current puzzle (reset board to initial FEN) */
  const handleRestart = useCallback(() => {
    if (!initialFenRef.current) return;
    chessRef.current = new Chess(initialFenRef.current);
    setBoardFen(initialFenRef.current);
    setSelectedSquare(null);
    setValidMoves([]);
    setHintSquares({});
    setMovesTried([]);
    setStatus("playing");
    startTimeRef.current = Date.now();
  }, []);

  const handleHint = () => {
    setHintsUsed((h) => h + 1);
    fetchPuzzleSolution(puzzleQuery.data!.id).then((sol) => {
      if (sol.solutionUci.length > 0) {
        const move = sol.solutionUci[0];
        setHintSquares({
          [move.substring(0, 2)]: { backgroundColor: "rgba(59,130,246,0.45)" },
          [move.substring(2, 4)]: { backgroundColor: "rgba(59,130,246,0.25)" },
        });
        setSelectedSquare(null);
        setValidMoves([]);
      }
    });
  };

  const resetForNext = () => {
    chessRef.current = null;
    initialFenRef.current = "";
    setBoardFen("start");
    setSelectedSquare(null);
    setValidMoves([]);
    setHintSquares({});
    setHintsUsed(0);
    setSolution(null);
    setMovesTried([]);
    setStatus("loading");
    puzzleQuery.refetch();
  };

  const handleSelectUser = (name: string) => {
    localStorage.setItem(STORAGE_KEYS.username, name);
    setUsername(name);
    setTheme(undefined);
    chessRef.current = null;
    setBoardFen("start");
    setStatus("loading");
    setHintsUsed(0); setHintSquares({}); setSolution(null); setMovesTried([]);
    setSelectedSquare(null); setValidMoves([]);
  };

  const handleSelectTheme = (t: string | undefined) => {
    setTheme(t);
    chessRef.current = null;
    setBoardFen("start");
    setStatus("loading");
    setHintsUsed(0); setHintSquares({}); setSolution(null); setMovesTried([]);
    setSelectedSquare(null); setValidMoves([]);
  };

  const users = usersQuery.data ?? [];
  const availableThemes = themesQuery.data ?? [];
  const puzzle = puzzleQuery.data;
  const chess = chessRef.current;

  const squareStyles = buildSquareStyles(selectedSquare, validMoves, hintSquares);

  const AccountBar = () => (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Account:</span>
      {users.map((u) => (
        <button key={u.username} onClick={() => handleSelectUser(u.username)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            u.username === username ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}>
          {u.username} <span className="opacity-60">({u.gameCount})</span>
        </button>
      ))}
    </div>
  );

  const ThemeBar = () => {
    const useful = availableThemes.filter((t) => t !== "other");
    if (useful.length === 0) return null;
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Theme:</span>
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
        <p className="animate-pulse text-sm text-muted-foreground">Loading puzzle…</p>
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
          <p className="font-medium">No puzzles{theme ? ` for "${theme.replace(/_/g, " ")}"` : ""} for <span className="font-mono">{username}</span></p>
          <p className="mt-2 text-sm text-muted-foreground">
            {theme ? "Try a different theme, or " : ""}Games need to be synced and analyzed first.
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
                position: boardFen,
                boardOrientation: puzzle.sideToMove === "black" ? "black" : "white",
                darkSquareStyle: { backgroundColor: boardTheme.darkSquare },
                lightSquareStyle: { backgroundColor: boardTheme.lightSquare },
                ...(pieces ? { pieces } : {}),
                squareStyles,
                onPieceDrop: handlePieceDrop,
                onSquareClick: handleSquareClick,
              }}
            />
          </div>
        </div>

        {/* Side panel */}
        <div className="md:w-64">
          {status === "playing" && (
            <div className="mb-4 rounded-lg border p-4">
              <p className="font-medium capitalize">{puzzle.sideToMove} to move</p>
              <p className="mt-1 text-xs text-muted-foreground">Click a piece or drag to move</p>
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
                💡 Hint {hintsUsed > 0 && <span className="text-muted-foreground">({hintsUsed})</span>}
              </button>
            )}

            {status === "failed" && (
              <button onClick={handleRestart}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted">
                ↺ Try Again
              </button>
            )}

            {(status === "solved" || status === "failed") && (
              <button onClick={resetForNext}
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
