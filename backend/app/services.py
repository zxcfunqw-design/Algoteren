from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Condition
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    Contest,
    FileResource,
    Problem,
    ProblemTestCase,
    RatingEntry,
    Roadmap,
    Submission,
    SubmissionTestResult,
    Tutorial,
    User,
    utc_now,
)
from .security import hash_password


def json_loads_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return value if isinstance(value, list) else []


def json_dumps_list(values: list[str]) -> str:
    return json.dumps(values, ensure_ascii=False)


def normalize_output(text: str) -> str:
    stripped = text.replace("\r\n", "\n").strip()
    if not stripped:
        return ""
    lines = [line.rstrip() for line in stripped.split("\n")]
    return "\n".join(lines)


@dataclass(slots=True)
class CompilationResult:
    ok: bool
    artifact_ref: str | None = None
    stderr: str = ""


@dataclass(slots=True)
class ExecutionResult:
    status: str
    stdout: str = ""
    stderr: str = ""
    runtime_ms: int | None = None
    memory_kb: int | None = None


class JudgeRunner(Protocol):
    def compile(self, source_code: str, workspace: Path) -> CompilationResult: ...

    def run(self, artifact_ref: str, input_data: str, *, time_limit_ms: int, memory_limit_mb: int) -> ExecutionResult: ...


class DockerJudgeRunner:
    def __init__(self, *, image: str = "gcc:13") -> None:
        self.image = image

    def _docker_base(self, workspace: Path) -> list[str]:
        return [
            "docker",
            "run",
            "--rm",
            "--network",
            "none",
            "--memory",
            "256m",
            "--cpus",
            "1",
            "--pids-limit",
            "64",
            "-v",
            f"{workspace}:/workspace",
            "-w",
            "/workspace",
            self.image,
        ]

    def compile(self, source_code: str, workspace: Path) -> CompilationResult:
        workspace.mkdir(parents=True, exist_ok=True)
        source_path = workspace / "main.cpp"
        source_path.write_text(source_code, encoding="utf-8")

        command = self._docker_base(workspace) + [
            "g++",
            "-std=c++17",
            "-O2",
            "-pipe",
            "-o",
            "main",
            "main.cpp",
        ]
        try:
            completed = subprocess.run(command, capture_output=True, text=True, timeout=30, check=False)
        except FileNotFoundError as exc:
            return CompilationResult(ok=False, stderr="Docker CLI is not available")
        except subprocess.TimeoutExpired:
            return CompilationResult(ok=False, stderr="Compilation timed out")

        if completed.returncode != 0:
            return CompilationResult(ok=False, stderr=completed.stderr or "Compilation failed")
        return CompilationResult(ok=True, artifact_ref=str(workspace))

    def run(self, artifact_ref: str, input_data: str, *, time_limit_ms: int, memory_limit_mb: int) -> ExecutionResult:
        workspace = Path(artifact_ref)
        command = [
            "docker",
            "run",
            "--rm",
            "--network",
            "none",
            "--memory",
            f"{memory_limit_mb}m",
            "--cpus",
            "1",
            "--pids-limit",
            "64",
            "-v",
            f"{workspace}:/workspace",
            "-w",
            "/workspace",
            self.image,
            "./main",
        ]
        timeout_seconds = max(time_limit_ms / 1000.0, 0.1)
        try:
            completed = subprocess.run(
                command,
                input=input_data,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                check=False,
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult(status="timeout")
        except FileNotFoundError:
            return ExecutionResult(status="runtime_error", stderr="Docker CLI is not available")

        if completed.returncode != 0:
            return ExecutionResult(status="runtime_error", stdout=completed.stdout, stderr=completed.stderr)
        return ExecutionResult(status="ok", stdout=completed.stdout, runtime_ms=int(timeout_seconds * 1000 * 0.6))


class LocalCppJudgeRunner:
    def __init__(self, *, compiler: str = "g++") -> None:
        self.compiler = compiler

    def compile(self, source_code: str, workspace: Path) -> CompilationResult:
        workspace.mkdir(parents=True, exist_ok=True)
        source_path = workspace / "main.cpp"
        source_path.write_text(source_code, encoding="utf-8")
        binary_name = "main.exe" if os.name == "nt" else "main"
        command = [
            self.compiler,
            "-std=c++17",
            "-O2",
            "-pipe",
            "-o",
            binary_name,
            "main.cpp",
        ]
        try:
            completed = subprocess.run(
                command,
                cwd=workspace,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
        except FileNotFoundError:
            return CompilationResult(ok=False, stderr=f"{self.compiler} compiler is not available")
        except subprocess.TimeoutExpired:
            return CompilationResult(ok=False, stderr="Compilation timed out")

        if completed.returncode != 0:
            return CompilationResult(ok=False, stderr=completed.stderr or "Compilation failed")
        return CompilationResult(ok=True, artifact_ref=str(workspace))

    def run(self, artifact_ref: str, input_data: str, *, time_limit_ms: int, memory_limit_mb: int) -> ExecutionResult:
        workspace = Path(artifact_ref)
        binary_name = "main.exe" if os.name == "nt" else "main"
        binary_path = workspace / binary_name
        timeout_seconds = max(time_limit_ms / 1000.0, 0.1)
        try:
            started_at = datetime.now(timezone.utc)
            completed = subprocess.run(
                [str(binary_path)],
                cwd=workspace,
                input=input_data,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                check=False,
            )
            elapsed_ms = int((datetime.now(timezone.utc) - started_at).total_seconds() * 1000)
        except subprocess.TimeoutExpired:
            return ExecutionResult(status="timeout")
        except FileNotFoundError:
            return ExecutionResult(status="runtime_error", stderr=f"{binary_name} is not available")

        if completed.returncode != 0:
            return ExecutionResult(status="runtime_error", stdout=completed.stdout, stderr=completed.stderr)
        return ExecutionResult(status="ok", stdout=completed.stdout, runtime_ms=elapsed_ms)


class ScriptedJudgeRunner:
    def __init__(
        self,
        *,
        compile_ok: bool = True,
        compile_stderr: str = "",
        run_results: dict[str, ExecutionResult] | None = None,
    ) -> None:
        self.compile_ok = compile_ok
        self.compile_stderr = compile_stderr
        self.run_results = run_results or {}

    def compile(self, source_code: str, workspace: Path) -> CompilationResult:
        workspace.mkdir(parents=True, exist_ok=True)
        if self.compile_ok:
            return CompilationResult(ok=True, artifact_ref=str(workspace))
        return CompilationResult(ok=False, stderr=self.compile_stderr or "Compilation failed")

    def run(self, artifact_ref: str, input_data: str, *, time_limit_ms: int, memory_limit_mb: int) -> ExecutionResult:
        return self.run_results.get(input_data, ExecutionResult(status="ok", stdout=""))


class SubmissionEventHub:
    def __init__(self) -> None:
        self._condition = Condition()
        self._payloads: dict[int, dict] = {}

    def publish(self, submission_id: int, payload: dict) -> None:
        with self._condition:
            self._payloads[submission_id] = payload
            self._condition.notify_all()

    def wait_for(self, submission_id: int, timeout: float | None = None) -> dict | None:
        with self._condition:
            if submission_id not in self._payloads:
                self._condition.wait_for(lambda: submission_id in self._payloads, timeout=timeout)
            return self._payloads.pop(submission_id, None)

    def peek(self, submission_id: int) -> dict | None:
        with self._condition:
            payload = self._payloads.get(submission_id)
            return json.loads(json.dumps(payload)) if payload is not None else None


class JudgeService:
    def __init__(self, runner: JudgeRunner, event_hub: SubmissionEventHub) -> None:
        self.runner = runner
        self.event_hub = event_hub

    def evaluate_submission(self, session_factory, submission_id: int, workspace_root: Path) -> None:
        session = session_factory()
        try:
            submission = session.get(Submission, submission_id)
            if submission is None:
                return
            problem = session.get(Problem, submission.problem_id)
            if problem is None:
                return

            submission.status = "running"
            session.commit()

            workspace = Path(tempfile.mkdtemp(prefix=f"algoteren-{submission_id}-", dir=workspace_root))
            try:
                compile_result = self.runner.compile(submission.source_code, workspace)
                if not compile_result.ok or not compile_result.artifact_ref:
                    submission.status = "done"
                    submission.verdict = "compile_error"
                    submission.compile_output = compile_result.stderr
                    submission.finished_at = utc_now()
                    session.commit()
                    payload = self._serialize_submission(session, submission)
                    self.event_hub.publish(submission_id, payload)
                    return

                test_case_rows = session.scalars(
                    select(ProblemTestCase).where(ProblemTestCase.problem_id == problem.id).order_by(ProblemTestCase.order_index)
                ).all()
                compiled_artifact = compile_result.artifact_ref
                submission.test_results.clear()
                final_verdict = "accepted"
                compile_output = ""
                runtime_ms: int | None = None
                memory_kb: int | None = None

                for index, test_case in enumerate(test_case_rows):
                    run_result = self.runner.run(
                        compiled_artifact,
                        test_case.input_data,
                        time_limit_ms=problem.time_limit_ms,
                        memory_limit_mb=problem.memory_limit_mb,
                    )
                    runtime_ms = run_result.runtime_ms if run_result.runtime_ms is not None else runtime_ms
                    memory_kb = run_result.memory_kb if run_result.memory_kb is not None else memory_kb
                    normalized_actual = normalize_output(run_result.stdout)
                    normalized_expected = normalize_output(test_case.expected_output)
                    passed = False
                    notes = ""

                    if run_result.status == "timeout":
                        final_verdict = "time_limit"
                        notes = "Execution time limit exceeded"
                    elif run_result.status == "runtime_error":
                        final_verdict = "runtime_error"
                        notes = run_result.stderr or "Runtime error"
                    elif run_result.status == "memory_limit":
                        final_verdict = "memory_limit"
                        notes = "Memory limit exceeded"
                    elif normalized_actual != normalized_expected:
                        final_verdict = "wrong_answer"
                        notes = "Output mismatch"
                    else:
                        passed = True
                        notes = "Passed"

                    submission.test_results.append(
                        SubmissionTestResult(
                            order_index=index,
                            input_data=test_case.input_data,
                            expected_output=test_case.expected_output,
                            actual_output=run_result.stdout,
                            passed=passed,
                            status=run_result.status,
                            time_ms=run_result.runtime_ms,
                            memory_kb=run_result.memory_kb,
                            notes=notes,
                        )
                    )

                    if not passed:
                        submission.status = "done"
                        submission.verdict = final_verdict
                        submission.compile_output = compile_output
                        submission.runtime_ms = runtime_ms
                        submission.memory_kb = memory_kb
                        submission.finished_at = utc_now()
                        session.commit()
                        payload = self._serialize_submission(session, submission)
                        self.event_hub.publish(submission_id, payload)
                        return

                submission.status = "done"
                submission.verdict = final_verdict
                submission.compile_output = compile_output
                submission.runtime_ms = runtime_ms
                submission.memory_kb = memory_kb
                submission.finished_at = utc_now()
                session.commit()
                payload = self._serialize_submission(session, submission)
                self.event_hub.publish(submission_id, payload)
            finally:
                shutil.rmtree(workspace, ignore_errors=True)
        finally:
            session.close()

    def _serialize_submission(self, session: Session, submission: Submission) -> dict:
        session.refresh(submission)
        test_results = [
            {
                "order_index": row.order_index,
                "input_data": row.input_data,
                "expected_output": row.expected_output,
                "actual_output": row.actual_output,
                "passed": row.passed,
                "status": row.status,
                "time_ms": row.time_ms,
                "memory_kb": row.memory_kb,
                "notes": row.notes,
            }
            for row in submission.test_results
        ]
        return {
            "submission_id": submission.id,
            "status": submission.status,
            "verdict": submission.verdict,
            "compile_output": submission.compile_output,
            "runtime_ms": submission.runtime_ms,
            "memory_kb": submission.memory_kb,
            "test_results": test_results,
        }


def seed_mock_data(session: Session, static_files_dir: Path) -> None:
    if session.scalar(select(User.id).limit(1)) is not None:
        return

    admin = User(email="admin@algoteren.dev", password_hash=hash_password("Admin123!"), role="admin")
    student = User(email="student@algoteren.dev", password_hash=hash_password("Student123!"), role="student")
    session.add_all([admin, student])

    roadmaps = [
        Roadmap(
            slug="cpp",
            title="C++ Fundamentals",
            summary="A practical path from I/O basics to clean implementation habits.",
            track="cpp",
            level="starter",
            steps_json=json.dumps(
                ["Fast I/O", "Arrays and loops", "Functions", "Sorting", "Prefix sums", "Binary search", "Greedy thinking"]
            ),
        ),
        Roadmap(
            slug="data-structures",
            title="Data Structures",
            summary="Study the structures that keep contest solutions fast and tidy.",
            track="core",
            level="intermediate",
            steps_json=json.dumps(["Stacks", "Queues", "Deques", "Hash maps", "Priority queues", "Segment tree basics"]),
        ),
        Roadmap(
            slug="graph-theory",
            title="Graph Theory",
            summary="A route through traversal, components, shortest paths, and directed acyclic graphs.",
            track="graphs",
            level="intermediate",
            steps_json=json.dumps(["DFS", "BFS", "Connected components", "Toposort", "Shortest paths", "MST"]),
        ),
    ]
    session.add_all(roadmaps)

    problems = [
        Problem(
            slug="sum-two-numbers",
            collection="classics",
            title="Sum Two Numbers",
            statement="Read two integers and output their sum.",
            difficulty="easy",
            tags_json=json.dumps(["math", "implementation"]),
            time_limit_ms=1000,
            memory_limit_mb=256,
            sample_input="2 5\n",
            sample_output="7\n",
            explanation="The warm-up task used by the home page and the judge.",
        ),
        Problem(
            slug="max-of-three",
            collection="classics",
            title="Maximum of Three",
            statement="Read three integers and print the largest one.",
            difficulty="easy",
            tags_json=json.dumps(["implementation", "conditionals"]),
            time_limit_ms=1000,
            memory_limit_mb=256,
            sample_input="8 3 5\n",
            sample_output="8\n",
            explanation="A compact problem to show sample and custom test cases.",
        ),
        Problem(
            slug="prefix-sum-window",
            collection="faang",
            title="Prefix Sum Window",
            statement="Read an array and report the largest sum of any window of length k.",
            difficulty="medium",
            tags_json=json.dumps(["prefix-sum", "two-pointers"]),
            time_limit_ms=1000,
            memory_limit_mb=256,
            sample_input="5 2\n1 2 3 4 5\n",
            sample_output="9\n",
            explanation="Used as a slightly richer example in the tutorials section.",
        ),
    ]
    session.add_all(problems)
    session.flush()

    test_cases = {
        "sum-two-numbers": [
            ("1 2\n", "3\n"),
            ("10 15\n", "25\n"),
        ],
        "max-of-three": [
            ("1 9 2\n", "9\n"),
            ("-3 -2 -7\n", "-2\n"),
        ],
        "prefix-sum-window": [
            ("5 2\n1 2 3 4 5\n", "9\n"),
            ("4 3\n7 1 1 7\n", "9\n"),
        ],
    }
    for problem in problems:
        cases = test_cases[problem.slug]
        for index, (input_data, expected_output) in enumerate(cases):
            session.add(
                ProblemTestCase(
                    problem_id=problem.id,
                    order_index=index,
                    input_data=input_data,
                    expected_output=expected_output,
                    is_sample=index == 0,
                )
            )

    tutorials = [
        Tutorial(
            slug="fast-io-cpp",
            title="Fast I/O in C++",
            summary="What to change in your template before the contest starts.",
            body="Use `ios::sync_with_stdio(false);` and `cin.tie(nullptr);` before solving the first problem.",
            topic="cpp",
            related_problem_slug="sum-two-numbers",
            order_index=0,
        ),
        Tutorial(
            slug="prefix-sums",
            title="Prefix Sums Without the Noise",
            summary="A short guide to building one-pass sums and window queries.",
            body="Prefix sums let you answer range questions in constant time after one linear pass.",
            topic="arrays",
            related_problem_slug="prefix-sum-window",
            order_index=1,
        ),
        Tutorial(
            slug="contest-routine",
            title="Contest Routine",
            summary="A calm routine for reading, planning, and submitting under pressure.",
            body="Read all statements, pick an easy win first, then return to the harder tasks with a clean notebook.",
            topic="workflow",
            related_problem_slug=None,
            order_index=2,
        ),
    ]
    session.add_all(tutorials)

    files = [
        FileResource(
            slug="cpp-template",
            title="C++ Contest Template",
            description="A tiny starter template with fast I/O and utility helpers.",
            kind="template",
            download_path="/static/files/cpp-template.txt",
            order_index=0,
        ),
        FileResource(
            slug="problem-solving-notes",
            title="Problem Solving Notes",
            description="A short mock reference sheet for recurring contest patterns.",
            kind="notes",
            download_path="/static/files/problem-solving-notes.txt",
            order_index=1,
        ),
        FileResource(
            slug="roadmap-summary",
            title="Roadmap Summary",
            description="A compact outline of the current learning tracks.",
            kind="summary",
            download_path="/static/files/roadmap-summary.txt",
            order_index=2,
        ),
    ]
    session.add_all(files)

    contests = [
        Contest(
            slug="weekly-1",
            title="Weekly Sprint 1",
            description="A mock contest built from the seed problems.",
            status="live",
            starts_at=datetime.now(timezone.utc),
            ends_at=datetime.now(timezone.utc),
            problem_slugs_json=json.dumps(["sum-two-numbers", "max-of-three", "prefix-sum-window"]),
        ),
        Contest(
            slug="weekly-2",
            title="Weekly Sprint 2",
            description="A follow-up contest with the same practice theme.",
            status="scheduled",
            starts_at=None,
            ends_at=None,
            problem_slugs_json=json.dumps(["sum-two-numbers", "prefix-sum-window"]),
        ),
    ]
    session.add_all(contests)

    ratings = [
        RatingEntry(handle="nileqqq", rating=2491, solved=182, country="KZ", trend="up"),
        RatingEntry(handle="autaons", rating=2410, solved=171, country="KZ", trend="up"),
        RatingEntry(handle="binary-fox", rating=2354, solved=164, country="KZ", trend="steady"),
        RatingEntry(handle="loopcraft", rating=2290, solved=153, country="PL", trend="up"),
        RatingEntry(handle="stackframe", rating=2218, solved=147, country="DE", trend="steady"),
    ]
    session.add_all(ratings)

    static_files_dir.mkdir(parents=True, exist_ok=True)
    file_contents = {
        "cpp-template.txt": "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    return 0;\n}\n",
        "problem-solving-notes.txt": "1. Read constraints first.\n2. Start with a brute force sketch.\n3. Test on the sample.\n4. Clean the implementation.\n",
        "roadmap-summary.txt": "Current tracks: C++, Data Structures, Graph Theory.\nEach track is backed by tutorials, problems, and contest practice.\n",
    }
    for name, content in file_contents.items():
        path = static_files_dir / name
        if not path.exists():
            path.write_text(content, encoding="utf-8")

    session.commit()
