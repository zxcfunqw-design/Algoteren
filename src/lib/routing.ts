export type Route =
  | { name: "dashboard" }
  | { name: "auth" }
  | { name: "leaderboard" }
  | { name: "theory" }
  | { name: "problem"; slug: string };

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "");
  if (!clean || clean === "dashboard") return { name: "dashboard" };
  if (clean === "auth") return { name: "auth" };
  if (clean === "leaderboard") return { name: "leaderboard" };
  if (clean === "theory") return { name: "theory" };
  if (clean.startsWith("problem/")) return { name: "problem", slug: clean.split("/")[1] };
  return { name: "dashboard" };
}

export function go(path: string) {
  window.location.hash = path;
}
