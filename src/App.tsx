import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { fallbackData } from "./data/fallbackData";
import { getBootstrap } from "./lib/api";
import { parseHash, type Route } from "./lib/routing";
import { AuthPage } from "./pages/AuthPage";
import { Dashboard } from "./pages/Dashboard";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { ProblemPage } from "./pages/ProblemPage";
import { TheoryPage } from "./pages/TheoryPage";
import type { PlatformData } from "./types";

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [data, setData] = useState<PlatformData>(fallbackData);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const bootstrap = await getBootstrap();
    setData(bootstrap);
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const task = route.name === "problem" ? data.tasks.find((item) => item.slug === route.slug) : undefined;

  return (
    <AppShell route={route}>
      {loading ? <LoadingScreen /> : null}
      {!loading && route.name === "dashboard" ? <Dashboard data={data} onRefresh={loadData} /> : null}
      {!loading && route.name === "auth" ? <AuthPage /> : null}
      {!loading && route.name === "theory" ? <TheoryPage articles={data.articles} /> : null}
      {!loading && route.name === "leaderboard" ? <LeaderboardPage standings={data.standings} contests={data.contests} /> : null}
      {!loading && route.name === "problem" && task ? <ProblemPage task={task} /> : null}
      {!loading && route.name === "problem" && !task ? (
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[16px] border border-line bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-ink">Problem not found</h1>
            <p className="mt-2 text-muted">The task may have been removed or the link is stale.</p>
          </div>
        </main>
      ) : null}
    </AppShell>
  );
}

function LoadingScreen() {
  return (
    <main className="bg-canvas">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl gap-4 px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-48 animate-pulse rounded-[16px] border border-line bg-white" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-40 animate-pulse rounded-[16px] border border-line bg-white" />
          <div className="h-40 animate-pulse rounded-[16px] border border-line bg-white" />
          <div className="h-40 animate-pulse rounded-[16px] border border-line bg-white" />
        </div>
      </div>
    </main>
  );
}
