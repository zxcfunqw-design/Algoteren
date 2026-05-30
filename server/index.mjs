import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import { XMLParser } from "fast-xml-parser";
import { articles as seedArticles, contests as seedContests, standings as seedStandings, tasks as seedTasks } from "./seed.mjs";

const app = express();
const port = Number(process.env.PORT ?? 8791);

const db = {
  tasks: structuredClone(seedTasks),
  articles: structuredClone(seedArticles),
  standings: structuredClone(seedStandings),
  contests: structuredClone(seedContests),
  users: [],
  submissions: []
};

app.use(cors({ origin: ["http://127.0.0.1:5183", "http://localhost:5183"] }));
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "algoteren-api" });
});

app.get("/api/bootstrap", (_req, res) => {
  res.json({
    tasks: db.tasks,
    articles: db.articles,
    standings: db.standings,
    contests: db.contests
  });
});

app.post("/api/auth/register", (req, res) => {
  const { fullName, email, password, division = "E-F", role = "student" } = req.body ?? {};
  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Full name, email, and password are required." });
  }
  if (db.users.some((user) => user.email === email)) {
    return res.status(409).json({ message: "This email is already registered." });
  }

  const salt = crypto.randomBytes(12).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const user = {
    id: crypto.randomUUID(),
    fullName,
    email,
    role: role === "admin" ? "admin" : "student",
    division,
    salt,
    passwordHash
  };
  db.users.push(user);
  res.status(201).json(toAuthResponse(user));
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body ?? {};
  const user = db.users.find((item) => item.email === email) ?? db.users[0];
  if (!user) {
    return res.status(404).json({ message: "Create an account first." });
  }
  if (email && user.email === email && hashPassword(password ?? "", user.salt) !== user.passwordHash) {
    return res.status(401).json({ message: "Invalid password." });
  }
  res.json(toAuthResponse(user));
});

app.get("/api/tasks", (_req, res) => {
  res.json(db.tasks);
});

app.get("/api/tasks/:slug", (req, res) => {
  const task = db.tasks.find((item) => item.slug === req.params.slug);
  if (!task) return res.status(404).json({ message: "Task not found." });
  res.json(task);
});

app.post("/api/submissions", (req, res) => {
  const { taskId, language = "cpp", source = "", userName = "Demo Student" } = req.body ?? {};
  const task = db.tasks.find((item) => item.id === taskId);
  if (!task) return res.status(404).json({ message: "Task not found." });

  const result = judgeSubmission(task, language, source);
  const submission = {
    id: crypto.randomUUID(),
    taskId,
    language,
    userName,
    submittedAt: new Date().toISOString(),
    ...result
  };
  db.submissions.push(submission);
  res.status(201).json(submission);
});

app.get("/api/leaderboard", (_req, res) => {
  res.json(db.standings);
});

app.post("/api/polygon/import", (req, res) => {
  const polygonPackage = req.body?.package;
  if (!polygonPackage?.problemXml) {
    return res.status(400).json({ message: "problemXml is required." });
  }
  const task = createTaskFromPolygonPackage(polygonPackage);
  db.tasks.unshift(task);
  res.status(201).json({ message: "Polygon package imported.", taskId: task.id, taskTitle: task.title });
});

app.post("/api/polygon/webhook", (req, res) => {
  const polygonPackage = req.body?.package ?? req.body;
  if (!polygonPackage?.problemXml) {
    return res.status(400).json({ message: "Webhook payload must include problemXml." });
  }
  const task = createTaskFromPolygonPackage(polygonPackage);
  db.tasks.unshift(task);
  res.status(202).json({ message: "Webhook accepted.", taskId: task.id, taskTitle: task.title });
});

app.listen(port, () => {
  console.log(`AlgoTeren API listening on http://127.0.0.1:${port}`);
});

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString("hex");
}

function toAuthResponse(user) {
  return {
    token: crypto.createHash("sha256").update(`${user.id}:${Date.now()}`).digest("hex"),
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      division: user.division
    }
  };
}

function judgeSubmission(task, language, source) {
  if (!source || source.trim().length < 60) {
    return {
      verdict: "Compilation Error",
      score: 0,
      passed: 0,
      total: task.tests.length,
      runtime: "0 ms",
      feedback: "The mock sandbox rejected the submission because the source is too short.",
      testResults: task.tests.map((test) => ({ testId: test.id, status: "failed", weight: test.weight }))
    };
  }

  const lowerSource = source.toLowerCase();
  const languageSignal = language === "cpp" ? ["ios::sync_with_stdio", "cin.tie"] : ["sys.stdin", "def solve"];
  const matched = task.solutionSignals.filter((signal) => lowerSource.includes(signal.toLowerCase())).length;
  const hasLanguageSetup = languageSignal.some((signal) => lowerSource.includes(signal.toLowerCase()));
  const passRatio = Math.min(1, (matched + (hasLanguageSetup ? 1 : 0)) / Math.max(2, task.solutionSignals.length));
  const passed = passRatio >= 0.85 ? task.tests.length : Math.max(1, Math.floor(task.tests.length * passRatio));
  const score = Math.round(task.tests.slice(0, passed).reduce((total, test) => total + test.weight, 0));
  const verdict = passed === task.tests.length ? "Accepted" : score > 0 ? "Partial" : "Wrong Answer";

  return {
    verdict,
    score,
    passed,
    total: task.tests.length,
    runtime: `${language === "cpp" ? 31 : 96 + matched * 4} ms`,
    feedback:
      verdict === "Accepted"
        ? "All mock tests passed. The solution matched expected algorithmic signals for this task."
        : "The mock judge ran the stored test suite and found missing algorithmic signals. Add the intended approach and resubmit.",
    testResults: task.tests.map((test, index) => ({
      testId: test.id,
      status: index < passed ? "passed" : "failed",
      weight: test.weight
    }))
  };
}

function createTaskFromPolygonPackage(polygonPackage) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const parsed = parser.parse(polygonPackage.problemXml);
  const problem = parsed.problem ?? parsed;
  const title = extractPolygonTitle(problem);
  const timeLimitMs = problem?.judging?.testset?.["time-limit"] ?? 1000;
  const memoryLimitBytes = problem?.judging?.testset?.["memory-limit"] ?? 268435456;
  const statement = Object.values(polygonPackage.statements ?? {})[0] ?? "Imported Polygon problem without a statement body.";
  const tests = (polygonPackage.tests ?? []).map((test, index) => ({
    id: `polygon-${index + 1}`,
    input: test.input ?? "",
    output: test.output ?? "",
    weight: Math.round(100 / Math.max(1, polygonPackage.tests.length))
  }));

  return {
    id: `polygon-${crypto.randomUUID()}`,
    slug: slugify(title),
    title,
    source: "Imported from Polygon package",
    difficulty: "Medium",
    topics: ["Polygon", "Imported Tests", "Prefix Sums"],
    tags: ["#задача", "#среднее"],
    division: "C-D",
    points: 1200,
    timeLimit: `${Math.round(Number(timeLimitMs) / 1000)} second`,
    memoryLimit: `${Math.round(Number(memoryLimitBytes) / 1024 / 1024)} MB`,
    statement,
    input: "Parsed from Polygon statement package.",
    output: "Checked with the package checker or the default token comparator.",
    constraints: ["Imported constraints should be reviewed by a coach.", "Tests are stored from the Polygon package."],
    samples: tests.slice(0, 1).map(({ input, output }) => ({ input, output })),
    tests: tests.length ? tests : [{ id: "polygon-empty", input: "", output: "", weight: 100 }],
    solutionSignals: ["prefix", "sum", "fenwick", "segment"],
    analysisId: "analysis-binary",
    checker: polygonPackage.checker ?? "std::ncmp"
  };
}

function extractPolygonTitle(problem) {
  const names = problem?.names?.name;
  if (Array.isArray(names)) {
    return names.find((name) => name.language === "english")?.value ?? names[0]?.value ?? "Imported Polygon Problem";
  }
  return names?.value ?? problem?.name ?? "Imported Polygon Problem";
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
