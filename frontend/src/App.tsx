import { useEffect, useRef, useState, createContext, useContext, type DependencyList, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  Clock3,
  Code2,
  FileText,
  FolderOpen,
  Gauge,
  Home,
  LayoutDashboard,
  LibraryBig,
  ListChecks,
  LogIn,
  LogOut,
  Plus,
  PlusCircle,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  createContest,
  createFile,
  createProblem,
  createSubmission,
  createTutorial,
  getAdminSummary,
  getContest,
  getContests,
  getDashboard,
  getFiles,
  getProblem,
  getProblems,
  getRatings,
  getRoadmap,
  getRoadmaps,
  getSubmission,
  getTutorial,
  getTutorials,
  listSubmissions,
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
  register as apiRegister,
} from "./api";
import type {
  Submission,
  User,
} from "./types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const me = await apiMe();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function login(email: string, password: string) {
    const result = await apiLogin(email, password);
    setUser(result.user);
    return result.user;
  }

  async function register(email: string, password: string) {
    const result = await apiRegister(email, password);
    setUser(result.user);
    return result.user;
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</AuthContext.Provider>;
}

function useLoad<T>(factory: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    factory()
      .then((value) => {
        if (active) {
          setData(value);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Request failed");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, deps);

  return { data, loading, error };
}

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Pending";
  }
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function splitCommaList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseProblemTestCases(value: string): Array<{
  order_index: number;
  input_data: string;
  expected_output: string;
  is_sample: boolean;
}> {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item, index) => ({
        order_index: typeof item?.order_index === "number" ? item.order_index : index,
        input_data: String(item?.input_data ?? ""),
        expected_output: String(item?.expected_output ?? ""),
        is_sample: Boolean(item?.is_sample),
      }))
      .filter((item) => item.input_data.length > 0 && item.expected_output.length > 0);
  } catch {
    return [];
  }
}

function badgeTone(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("accept") || normalized.includes("live") || normalized.includes("up")) {
    return "success";
  }
  if (normalized.includes("wrong") || normalized.includes("error") || normalized.includes("limit")) {
    return "danger";
  }
  if (normalized.includes("medium") || normalized.includes("scheduled") || normalized.includes("queued")) {
    return "warning";
  }
  return "neutral";
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <span className={cls("badge", `badge-${tone}`)}>{children}</span>;
}

function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
}: {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cls("panel", className)}>
      {(eyebrow || title || action) && (
        <div className="panel-head">
          <div>
            {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
            {title ? <h2>{title}</h2> : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

function CardLink({
  to,
  title,
  description,
  meta,
  icon: Icon,
}: {
  to: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <Link to={to} className="card-link">
      <div className="card-link-top">
        <div className="card-link-icon">{Icon ? <Icon size={18} /> : <ArrowRight size={18} />}</div>
        <div className="card-link-meta">{meta}</div>
      </div>
      <div className="card-link-title">{title}</div>
      {description ? <div className="card-link-description">{description}</div> : null}
    </Link>
  );
}

function StatCard({ label, value, caption }: { label: string; value: ReactNode; caption?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {caption ? <div className="stat-caption">{caption}</div> : null}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cls("input", props.className)} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cls("textarea", props.className)} />;
}

function Button({
  children,
  variant = "primary",
  icon: Icon,
  type = "button",
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  icon?: LucideIcon;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button className={cls("button", `button-${variant}`, className)} type={type} onClick={onClick} disabled={disabled}>
      {Icon ? <Icon size={16} /> : null}
      <span>{children}</span>
    </button>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-body">{body}</div>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}

function LoadingCard() {
  return <div className="loading-card" />;
}

function RouteGuard({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="route-state">
        <LoadingCard />
        <LoadingCard />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (admin && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function SubmissionTone({ value }: { value: string | null | undefined }) {
  const text = value ?? "queued";
  return <Badge tone={badgeTone(text)}>{text.replace(/_/g, " ")}</Badge>;
}

function VerdictTone({ value }: { value: string | null | undefined }) {
  if (!value) {
    return <Badge tone="warning">queued</Badge>;
  }
  return <Badge tone={badgeTone(value)}>{value.replace(/_/g, " ")}</Badge>;
}

function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/roadmaps", label: "Roadmaps", icon: LibraryBig },
    { to: "/contests", label: "Contests", icon: Trophy },
    { to: "/problems", label: "Problems", icon: ListChecks },
    { to: "/problems/status", label: "Status", icon: Gauge },
    { to: "/arena", label: "Arena", icon: Terminal },
    { to: "/tutorials", label: "Tutorials", icon: BookOpen },
    { to: "/files", label: "Files", icon: FolderOpen },
    { to: "/ratings", label: "Ratings", icon: LayoutDashboard },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-title">AlgoTeren</div>
            <div className="brand-subtitle">practice platform</div>
          </div>
        </div>
        <nav className="nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cls("nav-link", isActive && "nav-link-active")} end={to === "/"}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
          <div className="nav-divider" />
          <NavLink to="/auth" className={({ isActive }) => cls("nav-link", isActive && "nav-link-active")}>
            <LogIn size={17} />
            <span>{user ? "Account" : "Sign in"}</span>
          </NavLink>
          {user?.role === "admin" ? (
            <NavLink to="/admin" className={({ isActive }) => cls("nav-link", isActive && "nav-link-active")}>
              <ShieldCheck size={17} />
              <span>Admin</span>
            </NavLink>
          ) : null}
          {user ? (
            <button
              type="button"
              className="nav-link nav-link-button"
              onClick={async () => {
                await logout();
                navigate("/auth");
              }}
            >
              <LogOut size={17} />
              <span>Logout</span>
            </button>
          ) : null}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-foot-title">Current user</div>
          <div className="sidebar-foot-value">{user ? user.email : "Guest"}</div>
          <div className="sidebar-foot-role">{user ? user.role : "read only"}</div>
        </div>
      </aside>
      <div className="content-shell">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-title">Study, solve, repeat.</div>
            <div className="topbar-subtitle">FastAPI SSE, admin content, and a single C++ judge lane.</div>
          </div>
          <div className="topbar-right">
            {user ? <Badge tone={user.role === "admin" ? "success" : "neutral"}>{user.role}</Badge> : <Badge tone="warning">guest</Badge>}
            <Link to="/auth" className="topbar-link">
              <UserRound size={16} />
              <span>{user ? "Profile" : "Sign in"}</span>
            </Link>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function HomePage() {
  const { data, loading, error } = useLoad(getDashboard, []);

  if (loading) {
    return (
      <div className="page-stack">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  if (error || !data) {
    return <EmptyState title="Dashboard unavailable" body={error ?? "No data yet."} action={<Button icon={Sparkles}>Retry later</Button>} />;
  }

  const stats = [
    { label: "Roadmaps", value: data.roadmaps.length, caption: "learning paths" },
    { label: "Problems", value: data.problems.length, caption: "seed tasks" },
    { label: "Tutorials", value: data.tutorials.length, caption: "editorial notes" },
    { label: "Files", value: data.files.length, caption: "downloadable resources" },
  ];

  return (
    <div className="page-stack">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">competitive programming, organized</div>
          <h1>Practice without the clutter.</h1>
          <p>
            A study-focused platform for roadmaps, contests, tasks, tutorials, files, and live C++ submissions. One judge result
            lands in the browser the moment it is ready.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/problems">
              <Play size={16} />
              <span>Start solving</span>
            </Link>
            <Link className="button button-secondary" to="/tutorials">
              <BookOpen size={16} />
              <span>Open tutorials</span>
            </Link>
            <Link className="button button-secondary" to="/files">
              <FolderOpen size={16} />
              <span>Browse files</span>
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-title">Featured task</div>
          {data.featured_problem ? (
            <>
              <div className="hero-panel-name">{data.featured_problem.title}</div>
              <div className="hero-panel-copy">{data.featured_problem.statement}</div>
              <div className="chip-row">
                <Badge tone="success">{data.featured_problem.difficulty}</Badge>
                <Badge tone="neutral">{data.featured_problem.collection}</Badge>
                {data.featured_problem.tags.map((tag) => (
                  <Badge key={tag} tone="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No featured problem" body="Seed data has not been created yet." />
          )}
        </div>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="content-grid">
        <Panel title="Roadmaps" eyebrow="learning paths" action={<Link to="/roadmaps">View all</Link>}>
          <div className="stack-list">
            {data.roadmaps.slice(0, 3).map((roadmap) => (
              <CardLink
                key={roadmap.slug}
                to={`/roadmaps/${roadmap.slug}`}
                title={roadmap.title}
                description={roadmap.summary}
                meta={
                  <span className="meta-line">
                    <Gauge size={14} /> {roadmap.level} · {roadmap.steps.length} steps
                  </span>
                }
                icon={LibraryBig}
              />
            ))}
          </div>
        </Panel>
        <Panel title="Contests" eyebrow="scheduled practice" action={<Link to="/contests">View all</Link>}>
          <div className="stack-list">
            {data.contests.slice(0, 3).map((contest) => (
              <CardLink
                key={contest.slug}
                to={`/contests/${contest.slug}`}
                title={contest.title}
                description={contest.description}
                meta={<span className="meta-line">{contest.status.replace(/_/g, " ")}</span>}
                icon={Trophy}
              />
            ))}
          </div>
        </Panel>
        <Panel title="Tutorials" eyebrow="editorial notes" action={<Link to="/tutorials">View all</Link>}>
          <div className="stack-list">
            {data.tutorials.slice(0, 3).map((tutorial) => (
              <CardLink
                key={tutorial.slug}
                to={`/tutorials/${tutorial.slug}`}
                title={tutorial.title}
                description={tutorial.summary}
                meta={<span className="meta-line">{tutorial.topic}</span>}
                icon={BookOpen}
              />
            ))}
          </div>
        </Panel>
        <Panel title="Ratings" eyebrow="leaderboard" action={<Link to="/ratings">View all</Link>}>
          <div className="stack-list">
            {data.ratings.slice(0, 5).map((entry, index) => (
              <div key={entry.handle} className="leader-row">
                <div className="leader-rank">#{index + 1}</div>
                <div className="leader-main">
                  <div className="leader-name">{entry.handle}</div>
                  <div className="leader-meta">{entry.country} · {entry.solved} solved</div>
                </div>
                <div className="leader-rating">{entry.rating}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function RoadmapsPage() {
  const params = useParams();
  const slug = params.slug;
  const list = useLoad(getRoadmaps, []);
  const detail = useLoad(() => (slug ? getRoadmap(slug) : Promise.resolve(null)), [slug]);

  if (slug) {
    if (detail.loading) {
      return <LoadingCard />;
    }
    if (detail.error || !detail.data) {
      return <EmptyState title="Roadmap not found" body={detail.error ?? "The selected roadmap is missing."} />;
    }
    const roadmap = detail.data;
    return (
      <div className="page-stack">
        <Panel title={roadmap.title} eyebrow={`${roadmap.track} · ${roadmap.level}`}>
          <p className="panel-copy">{roadmap.summary}</p>
          <div className="chip-row">
            {roadmap.steps.map((step) => (
              <Badge key={step} tone="neutral">
                {step}
              </Badge>
            ))}
          </div>
        </Panel>
        <section className="content-grid two-up">
          <Panel title="Suggested problems" eyebrow="practice direction">
            <div className="stack-list">
              {roadmap.related_problems.map((problem) => (
                <Link key={problem} className="inline-link" to={`/problems/${problem}`}>
                  {problem}
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Suggested tutorials" eyebrow="study notes">
            <div className="stack-list">
              {roadmap.related_tutorials.map((tutorial) => (
                <Link key={tutorial} className="inline-link" to={`/tutorials/${tutorial}`}>
                  {tutorial}
                </Link>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    );
  }

  if (list.loading) {
    return <LoadingCard />;
  }

  if (list.error || !list.data) {
    return <EmptyState title="Roadmaps unavailable" body={list.error ?? "No roadmaps yet."} />;
  }

  return (
    <div className="page-stack">
      <div className="page-title-block">
        <div className="eyebrow">roadmaps</div>
        <h1>Structured learning tracks</h1>
        <p>Follow the C++ and algorithm paths one step at a time, or jump into a topic directly.</p>
      </div>
      <section className="grid-cards">
        {list.data.map((roadmap) => (
          <CardLink
            key={roadmap.slug}
            to={`/roadmaps/${roadmap.slug}`}
            title={roadmap.title}
            description={roadmap.summary}
            meta={<span className="meta-line">{roadmap.level} · {roadmap.steps.length} steps</span>}
            icon={LibraryBig}
          />
        ))}
      </section>
    </div>
  );
}

function ContestsPage() {
  const params = useParams();
  const slug = params.slug;
  const list = useLoad(getContests, []);
  const detail = useLoad(() => (slug ? getContest(slug) : Promise.resolve(null)), [slug]);

  if (slug) {
    if (detail.loading) {
      return <LoadingCard />;
    }
    if (detail.error || !detail.data) {
      return <EmptyState title="Contest not found" body={detail.error ?? "The contest has no data yet."} />;
    }
    const contest = detail.data;
    return (
      <div className="page-stack">
        <Panel title={contest.title} eyebrow={contest.status.replace(/_/g, " ")}>
          <p className="panel-copy">{contest.description}</p>
          <div className="meta-grid">
            <div>
              <div className="meta-label">Start</div>
              <div className="meta-value">{formatDate(contest.starts_at)}</div>
            </div>
            <div>
              <div className="meta-label">End</div>
              <div className="meta-value">{formatDate(contest.ends_at)}</div>
            </div>
          </div>
        </Panel>
        <Panel title="Problems" eyebrow="contest set">
          <div className="stack-list">
            {contest.problem_slugs.map((problem) => (
              <Link key={problem} className="inline-link" to={`/problems/${problem}`}>
                {problem}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  if (list.loading) {
    return <LoadingCard />;
  }
  if (list.error || !list.data) {
    return <EmptyState title="Contests unavailable" body={list.error ?? "No contests yet."} />;
  }

  return (
    <div className="page-stack">
      <div className="page-title-block">
        <div className="eyebrow">contests</div>
        <h1>Practice rounds</h1>
        <p>Mock contest windows and curated problem sets, ready for repeat practice.</p>
      </div>
      <section className="grid-cards">
        {list.data.map((contest) => (
          <CardLink
            key={contest.slug}
            to={`/contests/${contest.slug}`}
            title={contest.title}
            description={contest.description}
            meta={<span className="meta-line">{contest.status.replace(/_/g, " ")}</span>}
            icon={Trophy}
          />
        ))}
      </section>
    </div>
  );
}

function ProblemPage() {
  const params = useParams();
  const slug = params.slug;
  const list = useLoad(() => getProblems(), []);
  const detail = useLoad(() => (slug ? getProblem(slug) : Promise.resolve(null)), [slug]);
  const { user } = useAuth();
  const [code, setCode] = useState(`#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  long long a, b;\n  if (!(cin >> a >> b)) return 0;\n  cout << (a + b) << '\\n';\n  return 0;\n}\n`);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const streamRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setCode(`#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  long long a, b;\n  if (!(cin >> a >> b)) return 0;\n  cout << (a + b) << '\\n';\n  return 0;\n}\n`);
    setCurrentSubmission(null);
    setStatusText(null);
    streamRef.current?.close();
    streamRef.current = null;
  }, [slug]);

  useEffect(() => {
    return () => {
      streamRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setRecentSubmissions([]);
      return;
    }
    let active = true;
    listSubmissions()
      .then((items) => {
        if (active) {
          setRecentSubmissions(slug ? items.filter((item) => item.problem_slug === slug) : items);
        }
      })
      .catch(() => {
        if (active) {
          setRecentSubmissions([]);
        }
      });
    return () => {
      active = false;
    };
  }, [slug, user]);

  function mergeSubmission(base: Submission, payload: {
    status: string;
    verdict: string | null;
    compile_output: string;
    runtime_ms: number | null;
    memory_kb: number | null;
    test_results: Submission["test_results"];
  }): Submission {
    return {
      ...base,
      status: payload.status,
      verdict: payload.verdict,
      compile_output: payload.compile_output,
      runtime_ms: payload.runtime_ms,
      memory_kb: payload.memory_kb,
      finished_at: new Date().toISOString(),
      test_results: payload.test_results,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slug || !user) {
      return;
    }
    setSubmitting(true);
    setStatusText("queued");
    streamRef.current?.close();
    streamRef.current = null;
    try {
      const created = await createSubmission({ problem_slug: slug, language: "cpp", source_code: code });
      setCurrentSubmission(created);
      setRecentSubmissions((items) => [created, ...items.filter((item) => item.id !== created.id)]);

      const source = new EventSource(`/api/submissions/${created.id}/events`, { withCredentials: true });
      streamRef.current = source;

      source.addEventListener("submission", (event) => {
        const payload = JSON.parse((event as MessageEvent<string>).data) as {
          status: string;
          verdict: string | null;
          compile_output: string;
          runtime_ms: number | null;
          memory_kb: number | null;
          test_results: Submission["test_results"];
        };
        const updated = mergeSubmission(created, payload);
        setCurrentSubmission(updated);
        setRecentSubmissions((items) => [updated, ...items.filter((item) => item.id !== updated.id)]);
        setStatusText(payload.verdict ?? payload.status);
        setSubmitting(false);
        source.close();
      });

      source.onerror = async () => {
        source.close();
        try {
          const fresh = await getSubmission(created.id);
          setCurrentSubmission(fresh);
          setRecentSubmissions((items) => [fresh, ...items.filter((item) => item.id !== fresh.id)]);
          setStatusText(fresh.verdict ?? fresh.status);
        } catch {
          setStatusText("submission failed");
        } finally {
          setSubmitting(false);
        }
      };
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Submission failed");
      setSubmitting(false);
    }
  }

  if (slug) {
    if (detail.loading) {
      return <LoadingCard />;
    }
    if (detail.error || !detail.data) {
      return <EmptyState title="Problem not found" body={detail.error ?? "The selected problem is missing."} />;
    }

    const problem = detail.data;

    return (
      <div className="page-stack">
        <section className="problem-layout">
          <Panel
            title={problem.title}
            eyebrow={`${problem.collection} · ${problem.difficulty}`}
            action={<Link to="/problems/status">Status</Link>}
          >
            <div className="chip-row">
              {problem.tags.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="panel-copy">{problem.statement}</p>
            <div className="samples">
              <div className="sample-box">
                <div className="sample-label">Sample input</div>
                <pre>{problem.sample_input || "No sample input yet."}</pre>
              </div>
              <div className="sample-box">
                <div className="sample-label">Sample output</div>
                <pre>{problem.sample_output || "No sample output yet."}</pre>
              </div>
            </div>
            <div className="sample-box">
              <div className="sample-label">Notes</div>
              <p>{problem.explanation}</p>
            </div>
            <div className="sample-box">
              <div className="sample-label">Test cases</div>
              <div className="stack-list">
                {problem.test_cases.map((testCase) => (
                  <div key={`${testCase.order_index}-${testCase.input_data}`} className="testcase-row">
                    <div className="testcase-index">#{testCase.order_index + 1}</div>
                    <div className="testcase-block">
                      <div className="testcase-title">Input</div>
                      <pre>{testCase.input_data}</pre>
                    </div>
                    <div className="testcase-block">
                      <div className="testcase-title">Expected</div>
                      <pre>{testCase.expected_output}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
          <Panel
            title="Solve"
            eyebrow={user ? `signed in as ${user.email}` : "sign in required"}
            action={user ? <SubmissionTone value={statusText} /> : null}
          >
            {user ? (
              <form className="solve-form" onSubmit={handleSubmit}>
                <Field label="C++ source" hint="The judge accepts C++ only in v1.">
                  <TextArea value={code} onChange={(event) => setCode(event.target.value)} rows={18} spellCheck={false} />
                </Field>
                <div className="action-row">
                  <Button type="submit" icon={Send} disabled={submitting}>
                    {submitting ? "Submitting" : "Submit"}
                  </Button>
                  <Badge tone="neutral">{problem.time_limit_ms} ms</Badge>
                  <Badge tone="neutral">{problem.memory_limit_mb} MB</Badge>
                </div>
              </form>
            ) : (
              <EmptyState
                title="Sign in to submit"
                body="Read the task freely, then sign in to send a C++ solution and receive a single SSE verdict event."
                action={
                  <Link className="button button-primary" to="/auth">
                    <LogIn size={16} />
                    <span>Go to auth</span>
                  </Link>
                }
              />
            )}
            {currentSubmission ? (
              <div className="submission-card">
                <div className="submission-top">
                  <div>
                    <div className="sample-label">Latest submission</div>
                    <div className="submission-title">#{currentSubmission.id}</div>
                  </div>
                  <VerdictTone value={currentSubmission.verdict ?? currentSubmission.status} />
                </div>
                <div className="submission-meta">
                  <span><Clock3 size={14} /> {formatDate(currentSubmission.finished_at ?? currentSubmission.created_at)}</span>
                  <span><Terminal size={14} /> {currentSubmission.language}</span>
                </div>
                <div className="sample-box">
                  <div className="sample-label">Judge output</div>
                  <pre>{currentSubmission.compile_output || "No compile output."}</pre>
                </div>
                <div className="sample-box">
                  <div className="sample-label">Test results</div>
                  <div className="stack-list">
                    {currentSubmission.test_results.map((result) => (
                      <div key={result.order_index} className="test-result">
                        <div className="test-result-head">
                          <span>Case {result.order_index + 1}</span>
                          <Badge tone={result.passed ? "success" : "danger"}>{result.passed ? "pass" : result.status}</Badge>
                        </div>
                        <div className="test-result-grid">
                          <div>
                            <div className="sample-label">Input</div>
                            <pre>{result.input_data}</pre>
                          </div>
                          <div>
                            <div className="sample-label">Expected</div>
                            <pre>{result.expected_output}</pre>
                          </div>
                          <div>
                            <div className="sample-label">Actual</div>
                            <pre>{result.actual_output || "No output."}</pre>
                          </div>
                        </div>
                        <div className="test-result-foot">
                          <span>{result.notes}</span>
                          <span>{result.time_ms ?? 0} ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </Panel>
        </section>
        <Panel title="Recent submissions" eyebrow="your history">
          {recentSubmissions.length ? (
            <div className="submission-list">
              {recentSubmissions.map((submission) => (
                <div key={submission.id} className="submission-row">
                  <div>
                    <div className="submission-title">#{submission.id}</div>
                    <div className="leader-meta">{submission.problem_slug ?? problem.slug} · {formatDate(submission.created_at)}</div>
                  </div>
                  <div className="submission-row-right">
                    <SubmissionTone value={submission.status} />
                    <VerdictTone value={submission.verdict} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No submissions yet" body="Submit a C++ solution and the live verdict will appear here." />
          )}
        </Panel>
      </div>
    );
  }

  if (list.loading) {
    return <LoadingCard />;
  }
  if (list.error || !list.data) {
    return <EmptyState title="Problems unavailable" body={list.error ?? "No problems yet."} />;
  }

  return (
    <div className="page-stack">
      <div className="page-title-block">
        <div className="eyebrow">problems</div>
        <h1>Problem sets and live solving</h1>
        <p>Open a task, read the statement, and submit C++ to the judge when you are ready.</p>
      </div>
      <section className="grid-cards">
        {list.data.map((problem) => (
          <CardLink
            key={problem.slug}
            to={`/problems/${problem.slug}`}
            title={problem.title}
            description={`${problem.collection} · ${problem.difficulty}`}
            meta={
              <span className="meta-line">
                {problem.tags.join(" · ")}
              </span>
            }
            icon={Code2}
          />
        ))}
      </section>
    </div>
  );
}

function StatusPage() {
  const { user } = useAuth();
  const [reload, setReload] = useState(0);
  const { data, loading, error } = useLoad(() => (user ? listSubmissions() : Promise.resolve([])), [user, reload]);

  if (!user) {
    return <EmptyState title="Sign in to see status" body="Your submission history appears here once you are logged in." action={<Link className="button button-primary" to="/auth"><LogIn size={16} /><span>Sign in</span></Link>} />;
  }

  if (loading) {
    return <LoadingCard />;
  }
  if (error || !data) {
    return <EmptyState title="Status unavailable" body={error ?? "No submissions yet."} />;
  }

  return (
    <div className="page-stack">
      <div className="page-title-block">
        <div className="eyebrow">status</div>
        <h1>Submission history</h1>
        <p>All runs, verdicts, and judge notes collected in one place.</p>
      </div>
      <div className="action-row">
        <Button variant="secondary" icon={Clock3} onClick={() => setReload((value) => value + 1)}>
          Refresh
        </Button>
      </div>
      <section className="submission-list">
        {data.length ? (
          data.map((submission) => (
            <div key={submission.id} className="submission-row">
              <div>
                <div className="submission-title">#{submission.id} · {submission.problem_slug ?? submission.problem_id}</div>
                <div className="leader-meta">{formatDate(submission.created_at)}</div>
              </div>
              <div className="submission-row-right">
                <SubmissionTone value={submission.status} />
                <VerdictTone value={submission.verdict} />
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No runs yet" body="Open a problem and submit a C++ solution to populate this view." />
        )}
      </section>
    </div>
  );
}

function TutorialsPage() {
  const params = useParams();
  const slug = params.slug;
  const list = useLoad(getTutorials, []);
  const detail = useLoad(() => (slug ? getTutorial(slug) : Promise.resolve(null)), [slug]);

  if (slug) {
    if (detail.loading) {
      return <LoadingCard />;
    }
    if (detail.error || !detail.data) {
      return <EmptyState title="Tutorial not found" body={detail.error ?? "The tutorial is missing."} />;
    }
    const tutorial = detail.data;
    return (
      <div className="page-stack">
        <Panel title={tutorial.title} eyebrow={tutorial.topic}>
          <p className="panel-copy">{tutorial.summary}</p>
          <div className="article-body">{tutorial.body}</div>
          {tutorial.related_problem_slug ? (
            <Link className="inline-link" to={`/problems/${tutorial.related_problem_slug}`}>
              Open related problem
            </Link>
          ) : null}
        </Panel>
      </div>
    );
  }

  if (list.loading) {
    return <LoadingCard />;
  }
  if (list.error || !list.data) {
    return <EmptyState title="Tutorials unavailable" body={list.error ?? "No tutorials yet."} />;
  }

  return (
    <div className="page-stack">
      <div className="page-title-block">
        <div className="eyebrow">tutorials</div>
        <h1>Short, practical notes</h1>
        <p>Concise explanations that sit beside the problem set rather than above it.</p>
      </div>
      <section className="grid-cards">
        {list.data.map((tutorial) => (
          <CardLink
            key={tutorial.slug}
            to={`/tutorials/${tutorial.slug}`}
            title={tutorial.title}
            description={tutorial.summary}
            meta={<span className="meta-line">{tutorial.topic}</span>}
            icon={BookOpen}
          />
        ))}
      </section>
    </div>
  );
}

function FilesPage() {
  const { data, loading, error } = useLoad(getFiles, []);
  if (loading) {
    return <LoadingCard />;
  }
  if (error || !data) {
    return <EmptyState title="Files unavailable" body={error ?? "No files yet."} />;
  }

  return (
    <div className="page-stack">
      <div className="page-title-block">
        <div className="eyebrow">files</div>
        <h1>Templates and reference sheets</h1>
        <p>Mock files seeded by the backend, available as simple downloads.</p>
      </div>
      <section className="grid-cards">
        {data.map((file) => (
          <div key={file.slug} className="card-link">
            <div className="card-link-top">
              <div className="card-link-icon"><FileText size={18} /></div>
              <div className="card-link-meta">
                <Badge tone="neutral">{file.kind}</Badge>
              </div>
            </div>
            <div className="card-link-title">{file.title}</div>
            <div className="card-link-description">{file.description}</div>
            <a className="inline-link" href={file.download_path} target="_blank" rel="noreferrer">
              Open file
            </a>
          </div>
        ))}
      </section>
    </div>
  );
}

function RatingsPage() {
  const { data, loading, error } = useLoad(getRatings, []);
  if (loading) {
    return <LoadingCard />;
  }
  if (error || !data) {
    return <EmptyState title="Ratings unavailable" body={error ?? "No ratings yet."} />;
  }

  return (
    <div className="page-stack">
      <div className="page-title-block">
        <div className="eyebrow">ratings</div>
        <h1>Leaderboard</h1>
        <p>Mock ranking data that mirrors the sitemap and surfaces practice momentum.</p>
      </div>
      <Panel title="Top rated">
        <div className="leaderboard">
          {data.map((entry, index) => (
            <div key={entry.handle} className="leader-row">
              <div className="leader-rank">#{index + 1}</div>
              <div className="leader-main">
                <div className="leader-name">{entry.handle}</div>
                <div className="leader-meta">{entry.country} · {entry.solved} solved · {entry.trend}</div>
              </div>
              <div className="leader-rating">{entry.rating}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ArenaPage() {
  return (
    <div className="page-stack">
      <div className="page-title-block">
        <div className="eyebrow">arena</div>
        <h1>Single-language C++ judge lane</h1>
        <p>The current build keeps the execution surface narrow on purpose: C++ in Docker, SSE verdicts, no polling.</p>
      </div>
      <section className="content-grid two-up">
        <Panel title="Judge stack" eyebrow="runtime">
          <div className="stack-list">
            <div className="leader-row">
              <div className="leader-main">
                <div className="leader-name">Docker sandbox</div>
                <div className="leader-meta">No network, limited CPU and memory, temporary workspace</div>
              </div>
              <Badge tone="success">ready</Badge>
            </div>
            <div className="leader-row">
              <div className="leader-main">
                <div className="leader-name">SSE event</div>
                <div className="leader-meta">One final message per submission</div>
              </div>
              <Badge tone="neutral">push</Badge>
            </div>
            <div className="leader-row">
              <div className="leader-main">
                <div className="leader-name">Language</div>
                <div className="leader-meta">C++ only in v1</div>
              </div>
              <Badge tone="warning">limited</Badge>
            </div>
          </div>
        </Panel>
        <Panel title="Template" eyebrow="starter code">
          <pre className="code-sample">{`#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  return 0;
}`}</pre>
        </Panel>
      </section>
    </div>
  );
}

function AuthPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(mode === "login" ? "student@algoteren.dev" : "");
  const [password, setPassword] = useState(mode === "login" ? "Student123!" : "");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setEmail(mode === "login" ? "student@algoteren.dev" : "");
    setPassword(mode === "login" ? "Student123!" : "");
  }, [mode]);

  if (user) {
    return (
      <EmptyState
        title={`Signed in as ${user.email}`}
        body="You can return to the dashboard or switch to the admin tools if your account has that role."
        action={<Link className="button button-primary" to={user.role === "admin" ? "/admin" : redirectTo}><ArrowRight size={16} /><span>Continue</span></Link>}
      />
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="page-stack auth-grid">
      <Panel title="Authorization" eyebrow="email + password">
        <div className="toggle-row">
          <Button variant={mode === "login" ? "primary" : "secondary"} icon={LogIn} onClick={() => setMode("login")}>
            Login
          </Button>
          <Button variant={mode === "register" ? "primary" : "secondary"} icon={PlusCircle} onClick={() => setMode("register")}>
            Register
          </Button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <Field label="Email">
            <TextInput value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
          </Field>
          <Field label="Password">
            <TextInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </Field>
          {error ? <div className="form-error">{error}</div> : null}
          <Button type="submit" icon={working ? CircleCheck : Send} disabled={working}>
            {working ? "Working" : mode === "login" ? "Login" : "Create account"}
          </Button>
        </form>
      </Panel>
      <Panel title="Demo access" eyebrow="mock accounts">
        <div className="stack-list">
          <div className="leader-row">
            <div>
              <div className="leader-name">Admin</div>
              <div className="leader-meta">admin@algoteren.dev · Admin123!</div>
            </div>
            <Badge tone="success">admin</Badge>
          </div>
          <div className="leader-row">
            <div>
              <div className="leader-name">Student</div>
              <div className="leader-meta">student@algoteren.dev · Student123!</div>
            </div>
            <Badge tone="neutral">student</Badge>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function AdminPage() {
  const [problemForm, setProblemForm] = useState({
    slug: "",
    collection: "classics",
    title: "",
    statement: "",
    difficulty: "easy" as "easy" | "medium" | "hard",
    tags: "math, implementation",
    time_limit_ms: 1000,
    memory_limit_mb: 256,
    sample_input: "",
    sample_output: "",
    explanation: "",
    test_cases: `[
  { "order_index": 0, "input_data": "1 2\\n", "expected_output": "3\\n", "is_sample": true }
]`,
  });
  const [tutorialForm, setTutorialForm] = useState({
    slug: "",
    title: "",
    summary: "",
    body: "",
    topic: "cpp",
    related_problem_slug: "",
    order_index: 0,
  });
  const [fileForm, setFileForm] = useState({
    slug: "",
    title: "",
    description: "",
    kind: "template",
    download_path: "/static/files/example.txt",
    order_index: 0,
  });
  const [contestForm, setContestForm] = useState({
    slug: "",
    title: "",
    description: "",
    status: "scheduled",
    starts_at: "",
    ends_at: "",
    problem_slugs: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const summary = useLoad(getAdminSummary, [refreshKey]);

  async function submitProblem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking("problem");
    setMessage(null);
    try {
      await createProblem({
        ...problemForm,
        tags: splitCommaList(problemForm.tags),
        test_cases: parseProblemTestCases(problemForm.test_cases),
      });
      setMessage("Problem created");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Problem creation failed");
    } finally {
      setWorking(null);
    }
  }

  async function submitTutorial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking("tutorial");
    setMessage(null);
    try {
      await createTutorial({
        ...tutorialForm,
        related_problem_slug: tutorialForm.related_problem_slug || null,
      });
      setMessage("Tutorial created");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Tutorial creation failed");
    } finally {
      setWorking(null);
    }
  }

  async function submitFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking("file");
    setMessage(null);
    try {
      await createFile(fileForm);
      setMessage("File created");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "File creation failed");
    } finally {
      setWorking(null);
    }
  }

  async function submitContest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking("contest");
    setMessage(null);
    try {
      await createContest({
        ...contestForm,
        starts_at: contestForm.starts_at ? new Date(contestForm.starts_at).toISOString() : null,
        ends_at: contestForm.ends_at ? new Date(contestForm.ends_at).toISOString() : null,
        problem_slugs: splitCommaList(contestForm.problem_slugs),
      });
      setMessage("Contest created");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Contest creation failed");
    } finally {
      setWorking(null);
    }
  }

  if (summary.loading) {
    return <LoadingCard />;
  }
  if (summary.error || !summary.data) {
    return <EmptyState title="Admin unavailable" body={summary.error ?? "No admin summary yet."} />;
  }

  const summaryData = summary.data;

  return (
    <div className="page-stack">
      <div className="page-title-block">
        <div className="eyebrow">admin</div>
        <h1>Content management</h1>
        <p>Add problems, tutorials, files, and contests without touching the database directly.</p>
      </div>
      {message ? <div className="form-message">{message}</div> : null}
      <section className="admin-grid">
        <Panel title="Add problem" eyebrow="tasks">
          <form className="admin-form" onSubmit={submitProblem}>
            <Field label="Slug">
              <TextInput value={problemForm.slug} onChange={(event) => setProblemForm({ ...problemForm, slug: event.target.value })} />
            </Field>
            <Field label="Collection">
              <TextInput value={problemForm.collection} onChange={(event) => setProblemForm({ ...problemForm, collection: event.target.value })} />
            </Field>
            <Field label="Title">
              <TextInput value={problemForm.title} onChange={(event) => setProblemForm({ ...problemForm, title: event.target.value })} />
            </Field>
            <Field label="Difficulty">
              <select className="input" value={problemForm.difficulty} onChange={(event) => setProblemForm({ ...problemForm, difficulty: event.target.value as "easy" | "medium" | "hard" })}>
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </Field>
            <Field label="Tags" hint="Comma separated">
              <TextInput value={problemForm.tags} onChange={(event) => setProblemForm({ ...problemForm, tags: event.target.value })} />
            </Field>
            <Field label="Statement">
              <TextArea rows={6} value={problemForm.statement} onChange={(event) => setProblemForm({ ...problemForm, statement: event.target.value })} />
            </Field>
            <Field label="Sample input">
              <TextArea rows={3} value={problemForm.sample_input} onChange={(event) => setProblemForm({ ...problemForm, sample_input: event.target.value })} />
            </Field>
            <Field label="Sample output">
              <TextArea rows={3} value={problemForm.sample_output} onChange={(event) => setProblemForm({ ...problemForm, sample_output: event.target.value })} />
            </Field>
            <Field label="Test cases" hint="JSON array">
              <TextArea rows={6} value={problemForm.test_cases} onChange={(event) => setProblemForm({ ...problemForm, test_cases: event.target.value })} />
            </Field>
            <Button type="submit" icon={working === "problem" ? CircleCheck : Plus}>{working === "problem" ? "Saving" : "Save problem"}</Button>
          </form>
        </Panel>

        <Panel title="Add tutorial" eyebrow="tutorials">
          <form className="admin-form" onSubmit={submitTutorial}>
            <Field label="Slug">
              <TextInput value={tutorialForm.slug} onChange={(event) => setTutorialForm({ ...tutorialForm, slug: event.target.value })} />
            </Field>
            <Field label="Title">
              <TextInput value={tutorialForm.title} onChange={(event) => setTutorialForm({ ...tutorialForm, title: event.target.value })} />
            </Field>
            <Field label="Summary">
              <TextArea rows={3} value={tutorialForm.summary} onChange={(event) => setTutorialForm({ ...tutorialForm, summary: event.target.value })} />
            </Field>
            <Field label="Body">
              <TextArea rows={6} value={tutorialForm.body} onChange={(event) => setTutorialForm({ ...tutorialForm, body: event.target.value })} />
            </Field>
            <Field label="Topic">
              <TextInput value={tutorialForm.topic} onChange={(event) => setTutorialForm({ ...tutorialForm, topic: event.target.value })} />
            </Field>
            <Field label="Related problem">
              <TextInput value={tutorialForm.related_problem_slug} onChange={(event) => setTutorialForm({ ...tutorialForm, related_problem_slug: event.target.value })} />
            </Field>
            <Button type="submit" icon={working === "tutorial" ? CircleCheck : Plus}>{working === "tutorial" ? "Saving" : "Save tutorial"}</Button>
          </form>
        </Panel>

        <Panel title="Add file" eyebrow="files">
          <form className="admin-form" onSubmit={submitFile}>
            <Field label="Slug">
              <TextInput value={fileForm.slug} onChange={(event) => setFileForm({ ...fileForm, slug: event.target.value })} />
            </Field>
            <Field label="Title">
              <TextInput value={fileForm.title} onChange={(event) => setFileForm({ ...fileForm, title: event.target.value })} />
            </Field>
            <Field label="Description">
              <TextArea rows={4} value={fileForm.description} onChange={(event) => setFileForm({ ...fileForm, description: event.target.value })} />
            </Field>
            <Field label="Kind">
              <TextInput value={fileForm.kind} onChange={(event) => setFileForm({ ...fileForm, kind: event.target.value })} />
            </Field>
            <Field label="Download path">
              <TextInput value={fileForm.download_path} onChange={(event) => setFileForm({ ...fileForm, download_path: event.target.value })} />
            </Field>
            <Button type="submit" icon={working === "file" ? CircleCheck : Plus}>{working === "file" ? "Saving" : "Save file"}</Button>
          </form>
        </Panel>

        <Panel title="Add contest" eyebrow="contests">
          <form className="admin-form" onSubmit={submitContest}>
            <Field label="Slug">
              <TextInput value={contestForm.slug} onChange={(event) => setContestForm({ ...contestForm, slug: event.target.value })} />
            </Field>
            <Field label="Title">
              <TextInput value={contestForm.title} onChange={(event) => setContestForm({ ...contestForm, title: event.target.value })} />
            </Field>
            <Field label="Description">
              <TextArea rows={4} value={contestForm.description} onChange={(event) => setContestForm({ ...contestForm, description: event.target.value })} />
            </Field>
            <Field label="Status">
              <select className="input" value={contestForm.status} onChange={(event) => setContestForm({ ...contestForm, status: event.target.value })}>
                <option value="scheduled">scheduled</option>
                <option value="live">live</option>
                <option value="finished">finished</option>
              </select>
            </Field>
            <Field label="Starts at">
              <TextInput type="datetime-local" value={contestForm.starts_at} onChange={(event) => setContestForm({ ...contestForm, starts_at: event.target.value })} />
            </Field>
            <Field label="Ends at">
              <TextInput type="datetime-local" value={contestForm.ends_at} onChange={(event) => setContestForm({ ...contestForm, ends_at: event.target.value })} />
            </Field>
            <Field label="Problem slugs" hint="Comma separated">
              <TextInput value={contestForm.problem_slugs} onChange={(event) => setContestForm({ ...contestForm, problem_slugs: event.target.value })} />
            </Field>
            <Button type="submit" icon={working === "contest" ? CircleCheck : Plus}>{working === "contest" ? "Saving" : "Save contest"}</Button>
          </form>
        </Panel>
      </section>
      <section className="content-grid two-up">
        <Panel title="Current problems" eyebrow="summary">
          <div className="stack-list">
            {summaryData.problems.map((problem) => (
              <div key={problem.slug} className="leader-row">
                <div>
                  <div className="leader-name">{problem.title}</div>
                  <div className="leader-meta">{problem.collection} · {problem.difficulty}</div>
                </div>
                <Badge tone="neutral">{problem.slug}</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Current tutorials" eyebrow="summary">
          <div className="stack-list">
            {summaryData.tutorials.map((tutorial) => (
              <div key={tutorial.slug} className="leader-row">
                <div>
                  <div className="leader-name">{tutorial.title}</div>
                  <div className="leader-meta">{tutorial.topic}</div>
                </div>
                <Badge tone="neutral">{tutorial.slug}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function AppRoutes() {
  return (
    <AuthProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/roadmaps" element={<RoadmapsPage />} />
          <Route path="/roadmaps/:slug" element={<RoadmapsPage />} />
          <Route path="/contests" element={<ContestsPage />} />
          <Route path="/contests/:slug" element={<ContestsPage />} />
          <Route path="/problems" element={<ProblemPage />} />
          <Route path="/problems/:slug" element={<ProblemPage />} />
          <Route path="/problems/status" element={<RouteGuard><StatusPage /></RouteGuard>} />
          <Route path="/arena" element={<ArenaPage />} />
          <Route path="/tutorials" element={<TutorialsPage />} />
          <Route path="/tutorials/:slug" element={<TutorialsPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/ratings" element={<RatingsPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/admin" element={<RouteGuard admin><AdminPage /></RouteGuard>} />
          <Route path="*" element={<EmptyState title="Page not found" body="The route does not exist in this mock build." action={<Link className="button button-primary" to="/"><Home size={16} /><span>Back home</span></Link>} />} />
        </Routes>
      </AppShell>
    </AuthProvider>
  );
}

export default function App() {
  return <AppRoutes />;
}
