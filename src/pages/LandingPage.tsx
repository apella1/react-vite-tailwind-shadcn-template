import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchGames } from "@/api/games";

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-lg border p-4 transition hover:border-foreground/20 hover:shadow-sm">
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
          {hasGames ? "Browse Games →" : "Sync Your Games →"}
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
    </div>
  );
}
