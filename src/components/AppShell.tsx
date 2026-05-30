import { BarChart3, BookOpen, Code2, LayoutDashboard, LogIn, Menu, Trophy, X } from "lucide-react";
import { PropsWithChildren, useState } from "react";
import { go, type Route } from "../lib/routing";

const navItems = [
  { label: "Dashboard", path: "dashboard", icon: LayoutDashboard, route: "dashboard" },
  { label: "Problems", path: "dashboard", icon: Code2, route: "dashboard" },
  { label: "Theory", path: "theory", icon: BookOpen, route: "theory" },
  { label: "Leaderboard", path: "leaderboard", icon: Trophy, route: "leaderboard" }
];

interface AppShellProps extends PropsWithChildren {
  route: Route;
}

export function AppShell({ route, children }: AppShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-white text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => go("dashboard")}
            className="group flex items-center gap-3 rounded-xl2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl2 bg-brand-700 text-white shadow-lift transition group-hover:scale-105">
              <Code2 size={20} strokeWidth={2.2} />
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold tracking-tight">AlgoTeren</span>
              <span className="block text-xs text-muted">NIS Binary Club</span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = route.name === item.route;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => go(item.path)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-canvas hover:text-ink"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={() => go("auth")}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-card active:translate-y-0"
            >
              <LogIn size={16} />
              Sign in
            </button>
            <button
              type="button"
              onClick={() => go("auth")}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-brand-600 active:translate-y-0"
            >
              Register
            </button>
          </div>

          <button
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ink transition hover:bg-canvas lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-line bg-white px-4 py-3 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      go(item.path);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted transition hover:bg-canvas hover:text-ink"
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  go("auth");
                  setOpen(false);
                }}
                className="mt-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white"
              >
                Sign in or register
              </button>
            </div>
          </div>
        ) : null}
      </header>
      {children}
    </div>
  );
}
