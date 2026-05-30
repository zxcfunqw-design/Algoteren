import { CheckCircle2, LogIn, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { loginUser, registerUser } from "../lib/api";
import type { Division } from "../types";

const divisions: Division[] = ["E-F", "C-D", "A-B"];

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("student@nis.binary");
  const [password, setPassword] = useState("algoteren");
  const [division, setDivision] = useState<Division>("E-F");
  const [role, setRole] = useState<"student" | "admin">("student");
  const [message, setMessage] = useState("Create a student profile and join a division.");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const result =
        mode === "register"
          ? await registerUser({ fullName, email, password, division, role })
          : await loginUser({ email, password });
      setMessage(`${result.user.fullName} signed in as ${result.user.role}. Division ${result.user.division}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-canvas">
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">NIS Binary access</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            One account for practice, contests, and coach review.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            Students pick a division, solve tasks, submit code, and climb the AlgoTeren monthly rating.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["E-F Beginners", "C-D Experienced", "A-B Pros"].map((label) => (
              <div key={label} className="rounded-xl2 border border-line bg-white p-4 shadow-sm">
                <CheckCircle2 className="text-brand-700" size={18} />
                <p className="mt-3 text-sm font-semibold text-ink">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-[16px] border border-line bg-white p-4 shadow-card sm:p-6">
            <div className="grid grid-cols-2 rounded-xl bg-canvas p-1">
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  mode === "register" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                <UserPlus size={16} />
                Sign up
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  mode === "login" ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                <LogIn size={16} />
                Login
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              {mode === "register" ? (
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-ink">Full name</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="h-11 rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                    placeholder="Aruzhan Kali"
                    required
                  />
                </label>
              ) : null}

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                  required
                />
              </label>

              {mode === "register" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-ink">Division selection</span>
                    <select
                      value={division}
                      onChange={(event) => setDivision(event.target.value as Division)}
                      className="h-11 rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                    >
                      {divisions.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-ink">Role</span>
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value as "student" | "admin")}
                      className="h-11 rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                    >
                      <option value="student">Student</option>
                      <option value="admin">Admin/Coach</option>
                    </select>
                  </label>
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Working" : mode === "register" ? "Create account" : "Login"}
            </button>

            <p className="mt-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">{message}</p>
          </form>
        </div>
      </section>
    </main>
  );
}
