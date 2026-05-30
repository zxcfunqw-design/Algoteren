import { ArrowUpRight, BarChart3, CalendarClock, Minus, Trophy } from "lucide-react";
import { Badge } from "../components/Badge";
import type { Contest, Standing } from "../types";

export function LeaderboardPage({ standings, contests }: { standings: Standing[]; contests: Contest[] }) {
  const active = contests.find((contest) => contest.status === "Active") ?? contests[0];

  return (
    <main className="bg-canvas py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-[16px] border border-line bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge tone="green">#контест</Badge>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">AlgoTeren standings</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Ranking is based on accepted submissions, monthly contest points, and rating movement.
                </p>
              </div>
              <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Current event</p>
                <p className="mt-1 text-sm font-semibold text-ink">{active.title}</p>
              </div>
            </div>

            <div className="mt-7 overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Student</th>
                    <th className="px-3 py-2">Division</th>
                    <th className="px-3 py-2">Solved</th>
                    <th className="px-3 py-2">Points</th>
                    <th className="px-3 py-2">Rating</th>
                    <th className="px-3 py-2">Change</th>
                    <th className="px-3 py-2">Last submit</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={row.rank} className="rounded-xl bg-white shadow-sm">
                      <td className="rounded-l-xl border-y border-l border-line px-3 py-3">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-canvas text-sm font-semibold text-ink">
                          {row.rank}
                        </span>
                      </td>
                      <td className="border-y border-line px-3 py-3">
                        <p className="font-semibold text-ink">{row.name}</p>
                        <p className="text-xs text-muted">{row.streak} day streak</p>
                      </td>
                      <td className="border-y border-line px-3 py-3">
                        <Badge>{row.division}</Badge>
                      </td>
                      <td className="border-y border-line px-3 py-3 text-sm font-semibold text-ink">{row.solved}</td>
                      <td className="border-y border-line px-3 py-3 text-sm font-semibold text-ink">{row.points}</td>
                      <td className="border-y border-line px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-ink">{row.rating}</span>
                          <span className="h-2 w-24 overflow-hidden rounded-full bg-canvas">
                            <span
                              className="block h-full rounded-full bg-brand-700"
                              style={{ width: `${Math.min(100, Math.max(20, (row.rating - 1200) / 7))}%` }}
                            />
                          </span>
                        </div>
                      </td>
                      <td className="border-y border-line px-3 py-3">
                        <span className={row.change >= 0 ? "text-sm font-semibold text-brand-700" : "text-sm font-semibold text-rose-600"}>
                          {row.change >= 0 ? `+${row.change}` : row.change}
                        </span>
                      </td>
                      <td className="rounded-r-xl border-y border-r border-line px-3 py-3 text-sm text-muted">{row.lastSubmit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[16px] border border-line bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-ink">Rating tracker</h2>
                <BarChart3 className="text-brand-700" size={20} />
              </div>
              <div className="mt-5 space-y-4">
                {standings.slice(0, 4).map((row) => (
                  <div key={row.name}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink">{row.name}</span>
                      <span className={row.change >= 0 ? "text-brand-700" : "text-rose-600"}>
                        {row.change >= 0 ? `+${row.change}` : row.change}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-canvas">
                      <div className="h-2 rounded-full bg-brand-700" style={{ width: `${Math.min(94, row.solved * 4)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {contests.map((contest) => (
              <div key={contest.id} className="rounded-[16px] border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-ink">{contest.title}</h3>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                      <CalendarClock size={15} />
                      {contest.window}
                    </p>
                  </div>
                  <Badge tone={contest.status === "Active" ? "green" : "gray"}>{contest.status}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="text-xs text-muted">Tasks</p>
                    <p className="mt-1 font-semibold text-ink">{contest.taskCount}</p>
                  </div>
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="text-xs text-muted">Users</p>
                    <p className="mt-1 font-semibold text-ink">{contest.participants}</p>
                  </div>
                  <div className="rounded-xl bg-canvas p-3">
                    <p className="text-xs text-muted">Top</p>
                    <p className="mt-1 font-semibold text-ink">{contest.topScore || <Minus size={16} />}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700"
                >
                  Open contest
                  <ArrowUpRight size={16} />
                </button>
              </div>
            ))}
          </aside>
        </section>
      </div>
    </main>
  );
}
