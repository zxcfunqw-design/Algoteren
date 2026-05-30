import { ArrowLeft, CheckCircle2, Clock3, Cpu, FileCode2, Play, Send, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { cppStarter, pythonStarter } from "../data/fallbackData";
import { go } from "../lib/routing";
import { submitCode } from "../lib/api";
import type { Language, SubmissionResult, Task } from "../types";
import { Badge } from "../components/Badge";

export function ProblemPage({ task }: { task: Task }) {
  const [language, setLanguage] = useState<Language>("cpp");
  const [source, setSource] = useState(cppStarter);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const verdictTone = result?.verdict === "Accepted" ? "green" : result?.verdict === "Partial" ? "amber" : "red";

  function switchLanguage(next: Language) {
    setLanguage(next);
    setSource(next === "cpp" ? cppStarter : pythonStarter);
    setResult(null);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const response = await submitCode({ taskId: task.id, language, source, userName: "Demo Student" });
      setResult(response);
    } catch (error) {
      setResult({
        id: "local-error",
        verdict: "Compilation Error",
        score: 0,
        passed: 0,
        total: task.tests.length,
        runtime: "0 ms",
        feedback: error instanceof Error ? error.message : "Submission failed",
        testResults: []
      });
    } finally {
      setLoading(false);
    }
  }

  const starterNote = useMemo(() => {
    if (language === "cpp") return "C++17 with fast input enabled.";
    return "Python 3 for brute force, generators, and stress testing.";
  }, [language]);

  return (
    <main className="bg-canvas">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => go("dashboard")}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand-100 hover:text-brand-700"
        >
          <ArrowLeft size={16} />
          Back to tasks
        </button>

        <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
          <article className="rounded-[16px] border border-line bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              {task.tags.map((tag) => (
                <Badge key={tag} tone="green">
                  {tag}
                </Badge>
              ))}
              <Badge>{task.division}</Badge>
              <Badge>{task.points} pts</Badge>
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{task.title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted">{task.source}</p>

            <div className="mt-6 grid gap-3 border-y border-line py-4 sm:grid-cols-3">
              <span className="flex items-center gap-2 text-sm text-muted">
                <Clock3 size={16} />
                {task.timeLimit}
              </span>
              <span className="flex items-center gap-2 text-sm text-muted">
                <Cpu size={16} />
                {task.memoryLimit}
              </span>
              <span className="flex items-center gap-2 text-sm text-muted">
                <ShieldCheck size={16} />
                Mock sandbox
              </span>
            </div>

            <section className="mt-7">
              <h2 className="text-xl font-semibold tracking-tight text-ink">Statement</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{task.statement}</p>
            </section>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <section>
                <h2 className="text-lg font-semibold tracking-tight text-ink">Input</h2>
                <p className="mt-2 text-sm leading-7 text-muted">{task.input}</p>
              </section>
              <section>
                <h2 className="text-lg font-semibold tracking-tight text-ink">Output</h2>
                <p className="mt-2 text-sm leading-7 text-muted">{task.output}</p>
              </section>
            </div>

            <section className="mt-7">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Constraints</h2>
              <div className="mt-3 grid gap-2">
                {task.constraints.map((constraint) => (
                  <code key={constraint} className="rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-sm text-ink">
                    {constraint}
                  </code>
                ))}
              </div>
            </section>

            <section className="mt-7">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Samples</h2>
              <div className="mt-3 grid gap-3">
                {task.samples.map((sample, index) => (
                  <div key={`${sample.input}-${index}`} className="grid overflow-hidden rounded-xl border border-line md:grid-cols-2">
                    <div className="border-b border-line bg-canvas p-4 md:border-b-0 md:border-r">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Input</p>
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm text-ink">{sample.input}</pre>
                    </div>
                    <div className="bg-white p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Output</p>
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm text-ink">{sample.output}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </article>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-[16px] border border-line bg-white shadow-card">
              <div className="border-b border-line p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Code editor</p>
                    <p className="mt-1 text-xs text-muted">{starterNote}</p>
                  </div>
                  <FileCode2 className="text-brand-700" size={20} />
                </div>
                <div className="mt-4 grid grid-cols-2 rounded-xl bg-canvas p-1">
                  <button
                    type="button"
                    onClick={() => switchLanguage("cpp")}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      language === "cpp" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                    }`}
                  >
                    C++17
                  </button>
                  <button
                    type="button"
                    onClick={() => switchLanguage("python")}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      language === "python" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                    }`}
                  >
                    Python 3
                  </button>
                </div>
              </div>

              <textarea
                value={source}
                onChange={(event) => setSource(event.target.value)}
                spellCheck={false}
                className="h-[430px] w-full resize-none border-0 bg-[#0F172A] p-4 font-mono text-sm leading-6 text-slate-100 outline-none"
              />

              <div className="border-t border-line bg-white p-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-100 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Play size={16} />
                    Run sample
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:opacity-60"
                  >
                    <Send size={16} />
                    {loading ? "Judging" : "Submit"}
                  </button>
                </div>

                {result ? (
                  <div className="mt-4 rounded-xl border border-line bg-canvas p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={verdictTone}>{result.verdict}</Badge>
                      <span className="text-sm font-semibold text-ink">{result.score} pts</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted">{result.feedback}</p>
                    <div className="mt-4 grid gap-2">
                      {result.testResults.map((test) => (
                        <div key={test.testId} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                          <span className="flex items-center gap-2 text-ink">
                            <CheckCircle2
                              size={15}
                              className={test.status === "passed" ? "text-brand-700" : "text-rose-600"}
                            />
                            {test.testId}
                          </span>
                          <span className="font-semibold text-muted">{test.weight}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
