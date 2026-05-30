export type Difficulty = "Simple" | "Medium" | "Hard";
export type Division = "E-F" | "C-D" | "A-B";
export type Language = "cpp" | "python";
export type Verdict = "Accepted" | "Wrong Answer" | "Partial" | "Compilation Error";

export interface SampleCase {
  input: string;
  output: string;
}

export interface HiddenTest {
  id: string;
  input: string;
  output: string;
  weight: number;
}

export interface Task {
  id: string;
  slug: string;
  title: string;
  source: string;
  difficulty: Difficulty;
  topics: string[];
  tags: string[];
  division: Division;
  points: number;
  timeLimit: string;
  memoryLimit: string;
  statement: string;
  input: string;
  output: string;
  constraints: string[];
  samples: SampleCase[];
  tests: HiddenTest[];
  solutionSignals: string[];
  analysisId?: string;
}

export interface Article {
  id: string;
  tag: "#идея" | "#разбор";
  title: string;
  excerpt: string;
  readingTime: string;
  topics: string[];
  sections: {
    heading: string;
    body: string;
    code?: string;
  }[];
}

export interface Standing {
  rank: number;
  name: string;
  division: Division;
  solved: number;
  points: number;
  rating: number;
  change: number;
  lastSubmit: string;
  streak: number;
}

export interface Contest {
  id: string;
  title: string;
  status: "Active" | "Upcoming" | "Finished";
  window: string;
  taskCount: number;
  participants: number;
  topScore: number;
}

export interface PlatformData {
  tasks: Task[];
  articles: Article[];
  standings: Standing[];
  contests: Contest[];
}

export interface SubmissionResult {
  id: string;
  verdict: Verdict;
  score: number;
  passed: number;
  total: number;
  runtime: string;
  feedback: string;
  testResults: {
    testId: string;
    status: "passed" | "failed";
    weight: number;
  }[];
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: "student" | "admin";
    division: Division;
  };
}
