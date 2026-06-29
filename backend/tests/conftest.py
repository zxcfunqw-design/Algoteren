from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas import ContestCreate
from app.security import hash_password
from app.settings import Settings
from app.services import ExecutionResult, ScriptedJudgeRunner


@pytest.fixture()
def app_factory(tmp_path: Path):
    def factory(*, runner=None, seed_demo_data: bool = True):
        database_path = tmp_path / "algoteren-test.sqlite3"
        settings = Settings(
            database_url=f"sqlite:///{database_path}",
            secret_key="test-secret-key-with-32-bytes-minimum!",
            frontend_origin="http://testserver",
            seed_demo_data=seed_demo_data,
            auto_create_schema=True,
            cookie_secure=False,
        )
        return create_app(settings=settings, judge_runner=runner or ScriptedJudgeRunner(), seed_demo_data=seed_demo_data)

    return factory


@pytest.fixture()
def client_factory(app_factory):
    def factory(*, runner=None, seed_demo_data: bool = True):
        app = app_factory(runner=runner, seed_demo_data=seed_demo_data)
        return TestClient(app), app

    return factory


def build_cpp_runner(outputs: dict[str, str], *, compile_ok: bool = True, compile_stderr: str = "") -> ScriptedJudgeRunner:
    run_results = {
        input_data: ExecutionResult(status="ok", stdout=stdout)
        for input_data, stdout in outputs.items()
    }
    return ScriptedJudgeRunner(compile_ok=compile_ok, compile_stderr=compile_stderr, run_results=run_results)
