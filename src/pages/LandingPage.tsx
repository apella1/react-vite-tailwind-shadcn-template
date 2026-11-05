import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchGames } from "@/api/games";
import { useTheme } from "@/hooks/useTheme";
import { BOARD_THEMES, PIECE_STYLES } from "@/lib/theme";

function ThemeSelector() {
  const { settings, update } = useTheme();

  return (
    <div className="flex items-center gap-3 text-sm">
      <label className="text-muted-foreground">Board:</label>
      <select
        value={settings.boardThemeId}
        onChange={(e) => update({ ...settings, boardThemeId: e.target.value })}
        className="rounded border px-2 py-1"
      >
        {BOARD_THEMES.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <label className="text-muted-foreground">Pieces:</label>
      <select
        value={settings.pieceStyleId}
        onChange={(e) => update({ ...settings, pieceStyleId: e.target.value })}
        className="rounded border px-2 py-1"
      >
        {PIECE_STYLES.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 text-2xl">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const storedUsername = localStorage.getItem("tempo-username") ?? "";

  const gamesQuery = useQuery({
    queryKey: ["games", storedUsername, { size: 1 }],
    queryFn: () => fetchGames(storedUsername, { size: 1 }),
    enabled: storedUsername.length > 0,
  });

  const totalGames = gamesQuery.data?.totalElements ?? 0;
  const hasGames = totalGames > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <div className="mb-4 text-5xl">♟</div>
        <h1 className="text-4xl font-bold tracking-tight">Tempo</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Train on your own games — not generic puzzles.
        </p>
      </div>

      {/* Quick stats */}
      {storedUsername && (
        <div className="mb-8 flex justify-center gap-8 text-center">
          <div>
            <div className="text-2xl font-bold">{totalGames}</div>
            <div className="text-sm text-muted-foreground">Games imported</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{storedUsername}</div>
            <div className="text-sm text-muted-foreground">chess.com account</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mb-12 flex justify-center gap-3">
        <button
          onClick={() => navigate("/games")}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          {hasGames ? "Browse Games" : "Sync Your Games →"}
        </button>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureCard
          icon="📥"
          title="Import"
          desc="Sync your chess.com games automatically. Incremental sync keeps API calls minimal on re-sync."
        />
        <FeatureCard
          icon="🔍"
          title="Analyze"
          desc="Stockfish evaluates every move. Win-probability loss classifies blunders, mistakes, and inaccuracies."
        />
        <FeatureCard
          icon="🎯"
          title="Train"
          desc="Puzzles generated from your own mistakes. Spaced repetition targets your weakest patterns."
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FeatureCard
          icon="🤖"
          title="AI Reviews"
          desc="A local LLM writes plain-English coaching reviews for every game, grounded in engine facts."
        />
        <FeatureCard
          icon="📊"
          title="Weakness Profile"
          desc="Mistakes classified by type and tracked over time so you know what to work on."
        />
      </div>

      {/* Theme selector */}
      <div className="mt-12 rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-semibold">Appearance</h2>
        <ThemeSelector />
      </div>
    </div>
  );
}
