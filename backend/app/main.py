from __future__ import annotations

import shutil
import tempfile
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, build_session_factory
from .dependencies import ACCESS_COOKIE
from .routers import admin, auth, content, submissions
from .security import CSRF_COOKIE, CSRF_HEADER, uses_bearer_auth, validate_csrf
from .services import DockerJudgeRunner, JudgeService, LocalCppJudgeRunner, SubmissionEventHub, UnavailableJudgeRunner, seed_mock_data


def _select_judge_runner(settings):
    if shutil.which("docker"):
        return DockerJudgeRunner(
            image=settings.judge_image,
            compile_timeout_seconds=settings.judge_compile_timeout_seconds,
            max_output_bytes=settings.judge_max_output_bytes,
        )
    if settings.allow_local_judge:
        return LocalCppJudgeRunner(
            compile_timeout_seconds=settings.judge_compile_timeout_seconds,
            max_output_bytes=settings.judge_max_output_bytes,
        )
    return UnavailableJudgeRunner("Docker is required for judge execution")


def create_app(*, settings=None, judge_runner=None, seed_demo_data: bool | None = None) -> FastAPI:
    from .settings import get_settings

    resolved_settings = settings or get_settings()
    engine, session_factory = build_session_factory(resolved_settings)
    if resolved_settings.auto_create_schema:
        Base.metadata.create_all(bind=engine)

    static_root = Path(__file__).resolve().parent.parent / "static"
    files_dir = static_root / "files"
    if seed_demo_data is None:
        seed_demo_data = resolved_settings.seed_demo_data
    if seed_demo_data:
        with session_factory() as session:
            seed_mock_data(session, files_dir)

    event_hub = SubmissionEventHub()
    runner = judge_runner if judge_runner is not None else _select_judge_runner(resolved_settings)
    judge_service = JudgeService(runner, event_hub)
    workspace_root = Path(tempfile.gettempdir()) / "algoteren-workspaces"
    workspace_root.mkdir(parents=True, exist_ok=True)

    @asynccontextmanager
    async def lifespan(app_instance: FastAPI):
        yield
        app_instance.state.submission_executor.shutdown(wait=False, cancel_futures=True)

    app = FastAPI(title="AlgoTeren API", version="0.2.0", lifespan=lifespan)
    app.state.settings = resolved_settings
    app.state.session_factory = session_factory
    app.state.event_hub = event_hub
    app.state.judge_service = judge_service
    app.state.workspace_root = workspace_root
    app.state.submission_executor = ThreadPoolExecutor(max_workers=resolved_settings.judge_workers)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            resolved_settings.frontend_origin,
            "http://127.0.0.1:5173",
            "http://localhost:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def csrf_middleware(request: Request, call_next):
        if (
            resolved_settings.csrf_enabled
            and request.method in {"POST", "PUT", "PATCH", "DELETE"}
            and request.cookies.get(ACCESS_COOKIE)
            and not uses_bearer_auth(request)
        ):
            try:
                validate_csrf(request)
            except Exception as exc:
                return JSONResponse(status_code=403, content={"detail": getattr(exc, "detail", "CSRF token missing or invalid")})
        response = await call_next(request)
        if request.cookies.get(CSRF_COOKIE):
            response.headers["Vary"] = ", ".join(filter(None, {response.headers.get("Vary"), CSRF_HEADER}))
        return response

    app.mount("/static", StaticFiles(directory=static_root), name="static")
    app.include_router(auth.router)
    app.include_router(content.router)
    app.include_router(submissions.router)
    app.include_router(admin.router)
    return app


app = create_app()
