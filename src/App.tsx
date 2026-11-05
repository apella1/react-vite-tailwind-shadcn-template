import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import StatusPage from "@/pages/StatusPage";
import GamesPage from "@/pages/GamesPage";
import GameDetailPage from "@/pages/GameDetailPage";
import { APP } from "@/lib/brand";

function Nav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-foreground ${
      isActive ? "text-foreground" : "text-muted-foreground"
    }`;

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link to="/" className="text-base font-semibold transition hover:opacity-80">
          {APP.icon} {APP.name}
        </Link>
        <nav className="flex gap-4">
          <NavLink to="/games" className={linkClass}>
            Games
          </NavLink>
          <NavLink to="/status" className={linkClass}>
            Status
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/:id" element={<GameDetailPage />} />
            <Route path="/status" element={<StatusPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
