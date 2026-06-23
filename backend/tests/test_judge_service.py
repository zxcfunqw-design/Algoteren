from __future__ import annotations

from sqlalchemy import select

from app.models import Problem, Submission, User
from app.services import ExecutionResult, ScriptedJudgeRunner
from conftest import build_cpp_runner


def _create_submission(app, source_code: str) -> int:
    with app.state.session_factory() as session:
        user = session.scalar(select(User).where(User.email == "student@algoteren.dev"))
        problem = session.scalar(select(Problem).where(Problem.slug == "sum-two-numbers"))
        assert user is not None
        assert problem is not None
        submission = Submission(user_id=user.id, problem_id=problem.id, language="cpp", source_code=source_code, status="queued")
        session.add(submission)
        session.commit()
        session.refresh(submission)
        return submission.id


def _run_and_fetch(app, submission_id: int):
    app.state.judge_service.evaluate_submission(app.state.session_factory, submission_id, app.state.workspace_root)
    with app.state.session_factory() as session:
        submission = session.get(Submission, submission_id)
        if submission is not None:
            _ = len(submission.test_results)
        return submission


def test_judge_verdict_matrix(app_factory):
    cases = [
        (
            "accepted",
            build_cpp_runner({"1 2\n": "3\n", "10 15\n": "25\n"}),
            "#include <bits/stdc++.h>\nusing namespace std; int main(){ long long a,b; cin>>a>>b; cout<<(a+b)<<'\\n'; }\n",
            "accepted",
            2,
        ),
        (
            "wrong_answer",
            build_cpp_runner({"1 2\n": "4\n", "10 15\n": "25\n"}),
            "#include <bits/stdc++.h>\nusing namespace std; int main(){ long long a,b; cin>>a>>b; cout<<(a+b)<<'\\n'; }\n",
            "wrong_answer",
            1,
        ),
        (
            "runtime_error",
            ScriptedJudgeRunner(run_results={"1 2\n": ExecutionResult(status="runtime_error", stderr="boom")}),
            "#include <bits/stdc++.h>\nusing namespace std; int main(){ throw runtime_error(\"boom\"); }\n",
            "runtime_error",
            1,
        ),
        (
            "time_limit",
            ScriptedJudgeRunner(run_results={"1 2\n": ExecutionResult(status="timeout")}),
            "#include <bits/stdc++.h>\nusing namespace std; int main(){ while(true){} }\n",
            "time_limit",
            1,
        ),
        (
            "memory_limit",
            ScriptedJudgeRunner(run_results={"1 2\n": ExecutionResult(status="memory_limit")}),
            "#include <bits/stdc++.h>\nusing namespace std; int main(){ vector<int> v(1); cout << v.size(); }\n",
            "memory_limit",
            1,
        ),
        (
            "compile_error",
            ScriptedJudgeRunner(compile_ok=False, compile_stderr="compile failed"),
            "#include <bits/stdc++.h>\nusing namespace std; int main(){ syntax error }\n",
            "compile_error",
            0,
        ),
    ]

    for _, runner, source_code, verdict, expected_result_count in cases:
        app = app_factory(runner=runner)
        submission_id = _create_submission(app, source_code)
        submission = _run_and_fetch(app, submission_id)
        assert submission is not None
        assert submission.status == "done"
        assert submission.verdict == verdict
        assert len(submission.test_results) == expected_result_count
