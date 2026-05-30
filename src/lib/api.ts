import { fallbackData } from "../data/fallbackData";
import type { AuthResponse, Division, Language, PlatformData, SubmissionResult } from "../types";

const jsonHeaders = { "Content-Type": "application/json" };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message ?? "Request failed");
  }
  return response.json() as Promise<T>;
}

export async function getBootstrap(): Promise<PlatformData> {
  try {
    return await request<PlatformData>("/api/bootstrap");
  } catch {
    return fallbackData;
  }
}

export function registerUser(payload: {
  fullName: string;
  email: string;
  password: string;
  division: Division;
  role: "student" | "admin";
}) {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
}

export function loginUser(payload: { email: string; password: string }) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
}

export function submitCode(payload: { taskId: string; language: Language; source: string; userName: string }) {
  return request<SubmissionResult>("/api/submissions", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
}

export function importPolygonPackage() {
  return request<{ message: string; taskId: string; taskTitle: string }>("/api/polygon/import", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      source: "admin-panel",
      package: {
        problemXml: `<problem>
  <names>
    <name language="english" value="Polygon Sample: Prefix Garden" />
  </names>
  <judging>
    <testset name="tests">
      <time-limit>1000</time-limit>
      <memory-limit>268435456</memory-limit>
    </testset>
  </judging>
</problem>`,
        statements: {
          "english.md":
            "Given an array, answer range sum queries after point updates. This imported task demonstrates Polygon package parsing."
        },
        tests: [
          { input: "5 2\n1 2 3 4 5\n1 3\n2 5\n", output: "6\n14\n" },
          { input: "3 1\n7 8 9\n1 3\n", output: "24\n" }
        ],
        checker: "std::ncmp"
      }
    })
  });
}
