import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import StatusPage from "@/pages/StatusPage";
import GamesPage from "@/pages/GamesPage";
import GameDetailPage from "@/pages/GameDetailPage";

function Nav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-foreground ${
      isActive ? "text-foreground" : "text-muted-foreground"
    }`;

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <span className="text-base font-semibold">♟ Chess Trainer</span>
        <nav className="flex gap-4">
          <NavLink to="/" end className={linkClass}>
            Status
          </NavLink>
          <NavLink to="/games" className={linkClass}>
            Games
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
            <Route path="/" element={<StatusPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/:id" element={<GameDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
