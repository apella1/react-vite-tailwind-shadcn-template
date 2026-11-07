import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchGames } from "@/api/games";
import { APP, FEATURES, STORAGE_KEYS } from "@/lib/brand";

interface FeatureCardProps {
  icon: string;
  title: string;
  desc: string;
  route: string | null;
}

function FeatureCard({ icon, title, desc, route }: FeatureCardProps) {
  const navigate = useNavigate();
  const clickable = route !== null;

  return (
    <div
      onClick={clickable ? () => navigate(route!) : undefined}
      className={`rounded-lg border p-4 transition hover:border-foreground/20 hover:shadow-sm ${
        clickable ? "cursor-pointer hover:bg-muted/30" : ""
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        {clickable && (
          <span className="ml-auto text-xs text-muted-foreground opacity-60">→</span>
        )}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const storedUsername = localStorage.getItem(STORAGE_KEYS.username) ?? "";

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
        <div className="mb-4 text-5xl">{APP.icon}</div>
        <h1 className="text-4xl font-bold tracking-tight">{APP.name}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{APP.tagline}</p>
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
        {hasGames && (
          <button
            onClick={() => navigate("/train")}
            className="rounded-lg border px-6 py-2.5 text-sm font-medium transition hover:bg-muted"
          >
            🎯 Train
          </button>
        )}
      </div>

      {/* Feature cards — clickable if a route is defined */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FEATURES.slice(0, 3).map((f) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} route={f.route} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURES.slice(3).map((f) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} route={f.route} />
        ))}
      </div>
    </div>
  );
}
