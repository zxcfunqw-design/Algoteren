export type Role = "student" | "admin";

export interface User {
  id: number;
  email: string;
  role: Role;
  created_at: string;
}

export interface Roadmap {
  id: number;
  slug: string;
  title: string;
  summary: string;
  track: string;
  level: string;
  steps: string[];
  created_at: string;
}

export interface RoadmapDetail extends Roadmap {
  related_problems: string[];
  related_tutorials: string[];
}

export interface ProblemTestCase {
  order_index: number;
  input_data: string;
  expected_output: string;
  is_sample: boolean;
}

export interface ProblemListItem {
  id: number;
  slug: string;
  collection: string;
  title: string;
  difficulty: string;
  tags: string[];
  time_limit_ms: number;
  memory_limit_mb: number;
  contest_id: number | null;
}

export interface ProblemDetail extends ProblemListItem {
  statement: string;
  sample_input: string;
  sample_output: string;
  explanation: string;
  test_cases: ProblemTestCase[];
}

export interface Tutorial {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  topic: string;
  related_problem_slug: string | null;
  order_index: number;
  created_at: string;
}

export interface FileResource {
  id: number;
  slug: string;
  title: string;
  description: string;
  kind: string;
  download_path: string;
  order_index: number;
  created_at: string;
}

export interface Contest {
  id: number;
  slug: string;
  title: string;
  description: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  problem_slugs: string[];
  created_at: string;
}

export interface RatingEntry {
  id: number;
  handle: string;
  rating: number;
  solved: number;
  country: string;
  trend: string;
  created_at: string;
}

export interface SubmissionTestResult {
  order_index: number;
  input_data: string;
  expected_output: string;
  actual_output: string;
  passed: boolean;
  status: string;
  time_ms: number | null;
  memory_kb: number | null;
  notes: string;
}

export interface Submission {
  id: number;
  user_id: number;
  problem_id: number;
  language: string;
  status: string;
  verdict: string | null;
  compile_output: string;
  runtime_ms: number | null;
  memory_kb: number | null;
  created_at: string;
  finished_at: string | null;
  source_code?: string | null;
  problem_slug?: string | null;
  test_results: SubmissionTestResult[];
}

export interface DashboardData {
  roadmaps: Roadmap[];
  contests: Contest[];
  problems: ProblemListItem[];
  tutorials: Tutorial[];
  files: FileResource[];
  ratings: RatingEntry[];
  featured_problem: ProblemDetail | null;
}

export interface ProblemCreateInput {
  slug: string;
  collection: string;
  title: string;
  statement: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  time_limit_ms: number;
  memory_limit_mb: number;
  sample_input: string;
  sample_output: string;
  explanation: string;
  test_cases: Array<{
    order_index: number;
    input_data: string;
    expected_output: string;
    is_sample: boolean;
  }>;
}

export interface TutorialCreateInput {
  slug: string;
  title: string;
  summary: string;
  body: string;
  topic: string;
  related_problem_slug: string | null;
  order_index: number;
}

export interface FileCreateInput {
  slug: string;
  title: string;
  description: string;
  kind: string;
  download_path: string;
  order_index: number;
}

export interface ContestCreateInput {
  slug: string;
  title: string;
  description: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  problem_slugs: string[];
}

