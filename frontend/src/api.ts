import type {
  Contest,
  ContestCreateInput,
  DashboardData,
  FileCreateInput,
  FileResource,
  ProblemCreateInput,
  ProblemDetail,
  ProblemListItem,
  RatingEntry,
  Roadmap,
  RoadmapDetail,
  Submission,
  Tutorial,
  TutorialCreateInput,
  User,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function me() {
  return request<User>("/auth/me");
}

export function login(email: string, password: string) {
  return request<{ user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string) {
  return request<{ user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request<{ message: string }>("/auth/logout", { method: "POST" });
}

export function getDashboard() {
  return request<DashboardData>("/dashboard");
}

export function getRoadmaps() {
  return request<Roadmap[]>("/roadmaps");
}

export function getRoadmap(slug: string) {
  return request<RoadmapDetail>(`/roadmaps/${slug}`);
}

export function getProblems(collection?: string) {
  const suffix = collection ? `?collection=${encodeURIComponent(collection)}` : "";
  return request<ProblemListItem[]>(`/problems${suffix}`);
}

export function getProblem(slug: string) {
  return request<ProblemDetail>(`/problems/${slug}`);
}

export function createProblem(payload: ProblemCreateInput) {
  return request<ProblemDetail>("/admin/problems", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTutorials() {
  return request<Tutorial[]>("/tutorials");
}

export function getTutorial(slug: string) {
  return request<Tutorial>(`/tutorials/${slug}`);
}

export function createTutorial(payload: TutorialCreateInput) {
  return request<Tutorial>("/admin/tutorials", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getFiles() {
  return request<FileResource[]>("/files");
}

export function getFile(slug: string) {
  return request<FileResource>(`/files/${slug}`);
}

export function createFile(payload: FileCreateInput) {
  return request<FileResource>("/admin/files", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getContests() {
  return request<Contest[]>("/contests");
}

export function getContest(slug: string) {
  return request<Contest>(`/contests/${slug}`);
}

export function createContest(payload: ContestCreateInput) {
  return request<Contest>("/admin/contests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRatings() {
  return request<RatingEntry[]>("/ratings");
}

export function listSubmissions() {
  return request<Submission[]>("/submissions");
}

export function getSubmission(id: number) {
  return request<Submission>(`/submissions/${id}`);
}

export function createSubmission(payload: { problem_slug: string; language: "cpp"; source_code: string }) {
  return request<Submission>("/submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAdminSummary() {
  return request<{
    problems: ProblemListItem[];
    tutorials: Tutorial[];
    files: FileResource[];
    contests: Contest[];
  }>("/admin/summary");
}

