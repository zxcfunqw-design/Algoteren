from __future__ import annotations

import shutil

import pytest
from sqlalchemy import select

from app.main import create_app
from app.models import Problem, Submission, User
from app.services import LocalCppJudgeRunner, UnavailableJudgeRunner
from app.settings import Settings


def test_create_app_requires_docker_by_default_when_docker_is_missing(monkeypatch, tmp_path):
    monkeypatch.setattr("app.main.shutil.which", lambda name: None)
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'fallback.sqlite3'}",
        secret_key="test-secret-key-with-32-bytes-minimum!",
        frontend_origin="http://testserver",
        seed_demo_data=False,
        auto_create_schema=True,
        cookie_secure=False,
    )
    app = create_app(settings=settings, seed_demo_data=False)

    assert isinstance(app.state.judge_service.runner, UnavailableJudgeRunner)


def test_create_app_uses_local_runner_only_when_explicitly_allowed(monkeypatch, tmp_path):
    monkeypatch.setattr("app.main.shutil.which", lambda name: None)
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'fallback.sqlite3'}",
        secret_key="test-secret-key-with-32-bytes-minimum!",
        frontend_origin="http://testserver",
        seed_demo_data=False,
        auto_create_schema=True,
        cookie_secure=False,
        allow_local_judge=True,
    )
    app = create_app(settings=settings, seed_demo_data=False)

    assert isinstance(app.state.judge_service.runner, LocalCppJudgeRunner)


@pytest.mark.skipif(shutil.which("g++") is None, reason="g++ is required for the local judge fallback test")
def test_local_cpp_runner_accepts_the_seeded_sum_problem(app_factory):
    app = app_factory(runner=LocalCppJudgeRunner())

    with app.state.session_factory() as session:
        user = session.scalar(select(User).where(User.email == "student@algoteren.dev"))
        problem = session.scalar(select(Problem).where(Problem.slug == "sum-two-numbers"))
        assert user is not None
        assert problem is not None
        submission = Submission(
            user_id=user.id,
            problem_id=problem.id,
            language="cpp",
            source_code=(
                "#include <bits/stdc++.h>\n"
                "using namespace std;\n"
                "int main() {\n"
                "  ios::sync_with_stdio(false);\n"
                "  cin.tie(nullptr);\n"
                "  long long a, b;\n"
                "  if (!(cin >> a >> b)) return 0;\n"
                "  cout << (a + b) << '\\n';\n"
                "  return 0;\n"
                "}\n"
            ),
            status="queued",
        )
        session.add(submission)
        session.commit()
        session.refresh(submission)
        submission_id = submission.id

    app.state.judge_service.evaluate_submission(app.state.session_factory, submission_id, app.state.workspace_root)

    with app.state.session_factory() as session:
        submission = session.get(Submission, submission_id)
        assert submission is not None
        assert submission.status == "done"
        assert submission.verdict == "accepted"
        assert len(submission.test_results) == 2
