import { BarChart3, BookMarked, CalendarClock, Filter, Search, Trophy, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { getBootstrap } from "../lib/api";
import type { Difficulty, PlatformData } from "../types";
import { Badge } from "../components/Badge";
import { MetricCard } from "../components/MetricCard";
import { PolygonImporter } from "../components/PolygonImporter";
import { ProblemCard } from "../components/ProblemCard";
import { go } from "../lib/routing";

const difficultyOptions: Array<Difficulty | "All"> = ["All", "Simple", "Medium", "Hard"];

export function Dashboard({ data, onRefresh }: { data: PlatformData; onRefresh: () => Promise<void> }) {
  const [difficulty, setDifficulty] = useState<Difficulty | "All">("All");
  const [topic, setTopic] = useState("All");
  const [query, setQuery] = useState("");

  const topics = useMemo(() => {
    const all = data.tasks.flatMap((task) => task.topics);
    return ["All", ...Array.from(new Set(all))];
  }, [data.tasks]);

  const filteredTasks = useMemo(() => {
    return data.tasks.filter((task) => {
      const matchesDifficulty = difficulty === "All" || task.difficulty === difficulty;
      const matchesTopic = topic === "All" || task.topics.includes(topic);
      const searchable = [task.title, task.statement, task.source, ...task.topics, ...task.tags].join(" ").toLowerCase();
      const matchesQuery = searchable.includes(query.toLowerCase());
      return matchesDifficulty && matchesTopic && matchesQuery;
    });
  }, [data.tasks, difficulty, query, topic]);

  const activeContest = data.contests.find((contest) => contest.status === "Active") ?? data.contests[0];

  async function refreshAfterImport() {
    await getBootstrap();
    await onRefresh();
  }

  return (
    <main>
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-16">
          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex max-w-full flex-wrap gap-2">
              {["#задача", "#идея", "#разбор", "#контест"].map((tag) => (
                <Badge key={tag} tone="green">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
              The NIS Binary home for olympiad practice.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
              Structured topics, monthly contests, fast C++ workflows, and Python-backed testing in one calm workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => document.getElementById("tasks")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-600"
              >
                <Search size={16} />
                Browse tasks
              </button>
              <button
                type="button"
                onClick={() => go("leaderboard")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-card"
              >
                <Trophy size={16} />
                View standings
              </button>
            </div>
          </div>

          <aside className="min-w-0 overflow-hidden rounded-[16px] border border-line bg-canvas p-3 shadow-card">
            <div className="min-w-0 rounded-xl2 border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-muted">Active contest</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{activeContest.title}</h2>
                </div>
                <Badge tone="green">{activeContest.status}</Badge>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3 min-[360px]:grid-cols-3">
                <div className="rounded-xl bg-canvas p-3">
                  <p className="text-xs text-muted">Tasks</p>
                  <p className="mt-1 text-xl font-semibold">{activeContest.taskCount}</p>
                </div>
                <div className="rounded-xl bg-canvas p-3">
                  <p className="text-xs text-muted">People</p>
                  <p className="mt-1 text-xl font-semibold">{activeContest.participants}</p>
                </div>
                <div className="rounded-xl bg-canvas p-3">
                  <p className="text-xs text-muted">Top</p>
                  <p className="mt-1 text-xl font-semibold">{activeContest.topScore}</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {data.standings.slice(0, 5).map((row) => (
                  <div key={row.rank} className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700">
                        {row.rank}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">{row.name}</span>
                        <span className="text-xs text-muted">{row.division} division</span>
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-ink">{row.rating}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-canvas py-8">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <MetricCard label="Task bank" value={String(data.tasks.length)} detail="Seeded from AlgoTeren tags" icon={BookMarked} />
          <MetricCard label="Active learners" value="128" detail="Across E-F, C-D, A-B" icon={UsersRound} />
          <MetricCard label="Monthly contests" value={String(data.contests.length)} detail="Each contest has 4 tasks" icon={CalendarClock} />
          <MetricCard label="Accepted rate" value="63%" detail="Mock judge and samples" icon={BarChart3} />
        </div>
      </section>

      <section id="tasks" className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge tone="green">#задача</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">Problem set</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Filter by division, difficulty, or the exact training topics used by NIS Binary.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] lg:min-w-[520px]">
              <label className="relative block">
                <span className="sr-only">Search tasks</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                  placeholder="Search by topic or tag"
                />
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3">
                <Filter size={16} className="text-muted" />
                <select
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  className="h-10 min-w-[180px] bg-transparent text-sm text-ink outline-none"
                >
                  {topics.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {difficultyOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDifficulty(item)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  difficulty === item
                    ? "border-brand-700 bg-brand-700 text-white shadow-lift"
                    : "border-line bg-white text-muted hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTasks.map((task) => (
              <ProblemCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-canvas py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PolygonImporter onImported={refreshAfterImport} />
        </div>
      </section>
    </main>
  );
}
