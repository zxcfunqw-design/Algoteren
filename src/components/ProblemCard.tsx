import { ArrowUpRight, Clock3, Layers3 } from "lucide-react";
import { go } from "../lib/routing";
import type { Task } from "../types";
import { Badge } from "./Badge";

const difficultyTone = {
  Simple: "green",
  Medium: "amber",
  Hard: "red"
} as const;

export function ProblemCard({ task }: { task: Task }) {
  return (
    <article className="group rounded-xl2 border border-line bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand-100 hover:shadow-card">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={difficultyTone[task.difficulty]}>{task.difficulty}</Badge>
        <Badge>{task.division}</Badge>
        <Badge>{task.points} pts</Badge>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-ink">{task.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{task.statement}</p>
        </div>
        <button
          type="button"
          aria-label={`Open ${task.title}`}
          onClick={() => go(`problem/${task.slug}`)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-muted transition group-hover:border-brand-200 group-hover:bg-brand-50 group-hover:text-brand-700"
        >
          <ArrowUpRight size={18} />
        </button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {task.topics.slice(0, 3).map((topic) => (
          <span key={topic} className="rounded-lg bg-canvas px-2.5 py-1 text-xs font-medium text-muted">
            {topic}
          </span>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs text-muted">
        <span className="flex items-center gap-2">
          <Clock3 size={14} />
          {task.timeLimit}
        </span>
        <span className="flex items-center gap-2">
          <Layers3 size={14} />
          {task.memoryLimit}
        </span>
      </div>
    </article>
  );
}
