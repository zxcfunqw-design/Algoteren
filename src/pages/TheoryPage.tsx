import { BookOpen, Code2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "../components/Badge";
import type { Article } from "../types";

export function TheoryPage({ articles }: { articles: Article[] }) {
  const [activeId, setActiveId] = useState(articles[0]?.id ?? "");
  const active = articles.find((article) => article.id === activeId) ?? articles[0];

  if (!active) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-muted">No articles yet.</p>
      </main>
    );
  }

  return (
    <main className="bg-canvas py-10">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="space-y-3">
          <div className="rounded-[16px] border border-line bg-white p-5 shadow-sm">
            <Badge tone="green">#идея #разбор</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">Theory library</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Markdown-style lessons, implementation notes, and post-match takeaways for olympiad topics.
            </p>
          </div>
          {articles.map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => setActiveId(article.id)}
              className={`w-full rounded-xl2 border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card ${
                active.id === article.id ? "border-brand-100 bg-brand-50" : "border-line bg-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen size={16} className={active.id === article.id ? "text-brand-700" : "text-muted"} />
                <span className="text-xs font-semibold text-muted">{article.tag}</span>
              </div>
              <h2 className="mt-3 text-base font-semibold text-ink">{article.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{article.excerpt}</p>
            </button>
          ))}
        </aside>

        <article className="rounded-[16px] border border-line bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="green">{active.tag}</Badge>
            <Badge>{active.readingTime}</Badge>
            {active.topics.slice(0, 3).map((topic) => (
              <Badge key={topic}>{topic}</Badge>
            ))}
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{active.title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">{active.excerpt}</p>

          <div className="mt-8 space-y-8">
            {active.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="text-xl font-semibold tracking-tight text-ink">{section.heading}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{section.body}</p>
                {section.code ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A]">
                    <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-3 text-xs font-semibold text-slate-300">
                      <Code2 size={14} />
                      highlighted solution
                    </div>
                    <pre className="overflow-x-auto p-4 font-mono text-sm leading-6 text-slate-100">
                      <code>{section.code}</code>
                    </pre>
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
