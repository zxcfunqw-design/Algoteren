from __future__ import annotations

import json
import tempfile
import threading
import shutil
from datetime import timedelta
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, build_session_factory, get_db
from .models import Contest, FileResource, Problem, ProblemTestCase, RatingEntry, Roadmap, Submission, Tutorial, User
from .schemas import (
    AdminSummaryOut,
    AuthLoginRequest,
    AuthRegisterRequest,
    ContestCreate,
    ContestOut,
    DashboardOut,
    FileResourceCreate,
    FileResourceOut,
    LoginResponse,
    MessageResponse,
    ProblemCreate,
    ProblemDetailOut,
    ProblemListOut,
    ProblemTestCaseOut,
    RatingEntryOut,
    RoadmapDetailOut,
    RoadmapOut,
    SeededAuthOut,
    SubmissionCreate,
    SubmissionEventOut,
    SubmissionOut,
    SubmissionTestResultOut,
    TutorialCreate,
    TutorialOut,
    UserOut,
)
from .security import TokenType, create_token, decode_token, extract_bearer_token, hash_password, verify_password
from .services import DockerJudgeRunner, JudgeService, LocalCppJudgeRunner, SubmissionEventHub, json_dumps_list, json_loads_list, seed_mock_data


ACCESS_COOKIE = "algoteren_access_token"
REFRESH_COOKIE = "algoteren_refresh_token"


def create_app(*, settings=None, judge_runner=None, seed_demo_data: bool | None = None) -> FastAPI:
    from .settings import get_settings

    resolved_settings = settings or get_settings()
    engine, session_factory = build_session_factory(resolved_settings)
    Base.metadata.create_all(bind=engine)

    static_root = Path(__file__).resolve().parent.parent / "static"
    files_dir = static_root / "files"
    if seed_demo_data is None:
        seed_demo_data = resolved_settings.seed_demo_data
    if seed_demo_data:
        with session_factory() as session:
            seed_mock_data(session, files_dir)

    event_hub = SubmissionEventHub()
    if judge_runner is not None:
        runner = judge_runner
    elif shutil.which("docker"):
        runner = DockerJudgeRunner(image=resolved_settings.judge_image)
    else:
        runner = LocalCppJudgeRunner()
    judge_service = JudgeService(runner, event_hub)
    workspace_root = Path(tempfile.gettempdir()) / "algoteren-workspaces"
    workspace_root.mkdir(parents=True, exist_ok=True)

    app = FastAPI(title="AlgoTeren API", version="0.1.0")
    app.state.settings = resolved_settings
    app.state.session_factory = session_factory
    app.state.event_hub = event_hub
    app.state.judge_service = judge_service
    app.state.workspace_root = workspace_root

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

    app.mount("/static", StaticFiles(directory=static_root), name="static")

    def db_dependency():
        yield from get_db(session_factory)

    def set_auth_cookies(response: Response, user: User) -> None:
        access_token = create_token(
            secret_key=resolved_settings.secret_key,
            subject=str(user.id),
            token_type=TokenType.ACCESS,
            expires_delta=timedelta(minutes=resolved_settings.access_token_minutes),
        )
        refresh_token = create_token(
            secret_key=resolved_settings.secret_key,
            subject=str(user.id),
            token_type=TokenType.REFRESH,
            expires_delta=timedelta(days=resolved_settings.refresh_token_days),
        )
        response.set_cookie(ACCESS_COOKIE, access_token, httponly=True, samesite="lax", path="/")
        response.set_cookie(REFRESH_COOKIE, refresh_token, httponly=True, samesite="lax", path="/")

    def clear_auth_cookies(response: Response) -> None:
        response.delete_cookie(ACCESS_COOKIE, path="/")
        response.delete_cookie(REFRESH_COOKIE, path="/")

    def get_current_user(request: Request, db: Session = Depends(db_dependency)) -> User:
        token = extract_bearer_token(request, ACCESS_COOKIE)
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        payload = decode_token(token, secret_key=resolved_settings.secret_key, expected_type=TokenType.ACCESS)
        user = db.get(User, int(payload["sub"]))
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")
        return user

    def require_admin(user: User = Depends(get_current_user)) -> User:
        if user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        return user

    def problem_list_payload(problem: Problem) -> ProblemListOut:
        return ProblemListOut(
            id=problem.id,
            slug=problem.slug,
            collection=problem.collection,
            title=problem.title,
            difficulty=problem.difficulty,
            tags=json_loads_list(problem.tags_json),
            time_limit_ms=problem.time_limit_ms,
            memory_limit_mb=problem.memory_limit_mb,
            contest_id=problem.contest_id,
        )

    def problem_detail_payload(problem: Problem) -> ProblemDetailOut:
        test_cases = [
            ProblemTestCaseOut.model_validate(test_case)
            for test_case in sorted(problem.test_cases, key=lambda item: item.order_index)
        ]
        return ProblemDetailOut(
            **problem_list_payload(problem).model_dump(),
            statement=problem.statement,
            sample_input=problem.sample_input,
            sample_output=problem.sample_output,
            explanation=problem.explanation,
            test_cases=test_cases,
        )

    def tutorial_payload(tutorial: Tutorial) -> TutorialOut:
        return TutorialOut.model_validate(tutorial)

    def file_payload(file_resource: FileResource) -> FileResourceOut:
        return FileResourceOut.model_validate(file_resource)

    def roadmap_payload(roadmap: Roadmap) -> RoadmapOut:
        return RoadmapOut(
            id=roadmap.id,
            slug=roadmap.slug,
            title=roadmap.title,
            summary=roadmap.summary,
            track=roadmap.track,
            level=roadmap.level,
            steps=json_loads_list(roadmap.steps_json),
            created_at=roadmap.created_at,
        )

    def contest_payload(contest: Contest) -> ContestOut:
        return ContestOut(
            id=contest.id,
            slug=contest.slug,
            title=contest.title,
            description=contest.description,
            status=contest.status,
            starts_at=contest.starts_at,
            ends_at=contest.ends_at,
            problem_slugs=json_loads_list(contest.problem_slugs_json),
            created_at=contest.created_at,
        )

    def rating_payload(entry: RatingEntry) -> RatingEntryOut:
        return RatingEntryOut.model_validate(entry)

    def submission_payload(submission: Submission) -> SubmissionOut:
        return SubmissionOut(
            id=submission.id,
            user_id=submission.user_id,
            problem_id=submission.problem_id,
            language=submission.language,
            status=submission.status,
            verdict=submission.verdict,
            compile_output=submission.compile_output,
            runtime_ms=submission.runtime_ms,
            memory_kb=submission.memory_kb,
            created_at=submission.created_at,
            finished_at=submission.finished_at,
            source_code=submission.source_code,
            problem_slug=submission.problem.slug if submission.problem else None,
            test_results=[
                SubmissionTestResultOut.model_validate(item)
                for item in sorted(submission.test_results, key=lambda row: row.order_index)
            ],
        )

    def submission_event_payload(payload: dict) -> SubmissionEventOut:
        return SubmissionEventOut.model_validate(payload)

    def dashboard_payload(db: Session) -> DashboardOut:
        roadmaps = db.scalars(select(Roadmap).order_by(Roadmap.id)).all()
        contests = db.scalars(select(Contest).order_by(Contest.id)).all()
        problems = db.scalars(select(Problem).order_by(Problem.id)).all()
        tutorials = db.scalars(select(Tutorial).order_by(Tutorial.order_index)).all()
        files = db.scalars(select(FileResource).order_by(FileResource.order_index)).all()
        ratings = db.scalars(select(RatingEntry).order_by(RatingEntry.rating.desc())).all()
        featured_problem = problems[0] if problems else None
        return DashboardOut(
            roadmaps=[roadmap_payload(item) for item in roadmaps],
            contests=[contest_payload(item) for item in contests],
            problems=[problem_list_payload(item) for item in problems],
            tutorials=[tutorial_payload(item) for item in tutorials],
            files=[file_payload(item) for item in files],
            ratings=[rating_payload(item) for item in ratings],
            featured_problem=problem_detail_payload(featured_problem) if featured_problem else None,
        )

    @app.get("/api/health", response_model=MessageResponse)
    def health() -> MessageResponse:
        return MessageResponse(message="ok")

    @app.post("/api/auth/register", response_model=LoginResponse)
    def register(payload: AuthRegisterRequest, response: Response, db: Session = Depends(db_dependency)) -> LoginResponse:
        existing = db.scalar(select(User).where(User.email == payload.email.lower()))
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        user = User(email=payload.email.lower(), password_hash=hash_password(payload.password), role="student")
        db.add(user)
        db.commit()
        db.refresh(user)
        set_auth_cookies(response, user)
        return LoginResponse(user=UserOut.model_validate(user))

    @app.post("/api/auth/login", response_model=LoginResponse)
    def login(payload: AuthLoginRequest, response: Response, db: Session = Depends(db_dependency)) -> LoginResponse:
        user = db.scalar(select(User).where(User.email == payload.email.lower()))
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        set_auth_cookies(response, user)
        return LoginResponse(user=UserOut.model_validate(user))

    @app.post("/api/auth/refresh", response_model=LoginResponse)
    def refresh(request: Request, response: Response, db: Session = Depends(db_dependency)) -> LoginResponse:
        token = request.cookies.get(REFRESH_COOKIE)
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")
        payload = decode_token(token, secret_key=resolved_settings.secret_key, expected_type=TokenType.REFRESH)
        user = db.get(User, int(payload["sub"]))
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")
        set_auth_cookies(response, user)
        return LoginResponse(user=UserOut.model_validate(user))

    @app.post("/api/auth/logout", response_model=MessageResponse)
    def logout(response: Response) -> MessageResponse:
        clear_auth_cookies(response)
        return MessageResponse(message="logged out")

    @app.get("/api/auth/me", response_model=UserOut)
    def me(user: User = Depends(get_current_user)) -> UserOut:
        return UserOut.model_validate(user)

    @app.get("/api/dashboard", response_model=DashboardOut)
    def dashboard(db: Session = Depends(db_dependency)) -> DashboardOut:
        return dashboard_payload(db)

    @app.get("/api/roadmaps", response_model=list[RoadmapOut])
    def list_roadmaps(db: Session = Depends(db_dependency)) -> list[RoadmapOut]:
        return [roadmap_payload(item) for item in db.scalars(select(Roadmap).order_by(Roadmap.id)).all()]

    @app.get("/api/roadmaps/{slug}", response_model=RoadmapDetailOut)
    def get_roadmap(slug: str, db: Session = Depends(db_dependency)) -> RoadmapDetailOut:
        roadmap = db.scalar(select(Roadmap).where(Roadmap.slug == slug))
        if roadmap is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found")
        related_problems = [problem.slug for problem in db.scalars(select(Problem).order_by(Problem.id)).all()[:3]]
        related_tutorials = [tutorial.slug for tutorial in db.scalars(select(Tutorial).order_by(Tutorial.order_index)).all()[:3]]
        return RoadmapDetailOut(**roadmap_payload(roadmap).model_dump(), related_problems=related_problems, related_tutorials=related_tutorials)

    @app.get("/api/problems", response_model=list[ProblemListOut])
    def list_problems(collection: str | None = None, db: Session = Depends(db_dependency)) -> list[ProblemListOut]:
        query = select(Problem).order_by(Problem.id)
        if collection:
            query = query.where(Problem.collection == collection)
        return [problem_list_payload(item) for item in db.scalars(query).all()]

    @app.get("/api/problems/{slug}", response_model=ProblemDetailOut)
    def get_problem(slug: str, db: Session = Depends(db_dependency)) -> ProblemDetailOut:
        problem = db.scalar(select(Problem).where(Problem.slug == slug))
        if problem is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
        return problem_detail_payload(problem)

    @app.post("/api/admin/problems", response_model=ProblemDetailOut, status_code=status.HTTP_201_CREATED)
    def create_problem(
        payload: ProblemCreate,
        _: User = Depends(require_admin),
        db: Session = Depends(db_dependency),
    ) -> ProblemDetailOut:
        if db.scalar(select(Problem).where(Problem.slug == payload.slug)) is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Problem slug already exists")
        problem = Problem(
            slug=payload.slug,
            collection=payload.collection,
            title=payload.title,
            statement=payload.statement,
            difficulty=payload.difficulty,
            tags_json=json_dumps_list(payload.tags),
            time_limit_ms=payload.time_limit_ms,
            memory_limit_mb=payload.memory_limit_mb,
            sample_input=payload.sample_input,
            sample_output=payload.sample_output,
            explanation=payload.explanation,
        )
        db.add(problem)
        db.flush()
        for case in payload.test_cases:
            db.add(
                ProblemTestCase(
                    problem_id=problem.id,
                    order_index=case.order_index,
                    input_data=case.input_data,
                    expected_output=case.expected_output,
                    is_sample=case.is_sample,
                )
            )
        db.commit()
        db.refresh(problem)
        return problem_detail_payload(problem)

    @app.get("/api/tutorials", response_model=list[TutorialOut])
    def list_tutorials(db: Session = Depends(db_dependency)) -> list[TutorialOut]:
        return [tutorial_payload(item) for item in db.scalars(select(Tutorial).order_by(Tutorial.order_index)).all()]

    @app.get("/api/tutorials/{slug}", response_model=TutorialOut)
    def get_tutorial(slug: str, db: Session = Depends(db_dependency)) -> TutorialOut:
        tutorial = db.scalar(select(Tutorial).where(Tutorial.slug == slug))
        if tutorial is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutorial not found")
        return tutorial_payload(tutorial)

    @app.post("/api/admin/tutorials", response_model=TutorialOut, status_code=status.HTTP_201_CREATED)
    def create_tutorial(
        payload: TutorialCreate,
        _: User = Depends(require_admin),
        db: Session = Depends(db_dependency),
    ) -> TutorialOut:
        if db.scalar(select(Tutorial).where(Tutorial.slug == payload.slug)) is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tutorial slug already exists")
        tutorial = Tutorial(
            slug=payload.slug,
            title=payload.title,
            summary=payload.summary,
            body=payload.body,
            topic=payload.topic,
            related_problem_slug=payload.related_problem_slug,
            order_index=payload.order_index,
        )
        db.add(tutorial)
        db.commit()
        db.refresh(tutorial)
        return tutorial_payload(tutorial)

    @app.get("/api/files", response_model=list[FileResourceOut])
    def list_files(db: Session = Depends(db_dependency)) -> list[FileResourceOut]:
        return [file_payload(item) for item in db.scalars(select(FileResource).order_by(FileResource.order_index)).all()]

    @app.get("/api/files/{slug}", response_model=FileResourceOut)
    def get_file(slug: str, db: Session = Depends(db_dependency)) -> FileResourceOut:
        file_resource = db.scalar(select(FileResource).where(FileResource.slug == slug))
        if file_resource is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        return file_payload(file_resource)

    @app.post("/api/admin/files", response_model=FileResourceOut, status_code=status.HTTP_201_CREATED)
    def create_file(
        payload: FileResourceCreate,
        _: User = Depends(require_admin),
        db: Session = Depends(db_dependency),
    ) -> FileResourceOut:
        if db.scalar(select(FileResource).where(FileResource.slug == payload.slug)) is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File slug already exists")
        file_resource = FileResource(
            slug=payload.slug,
            title=payload.title,
            description=payload.description,
            kind=payload.kind,
            download_path=payload.download_path,
            order_index=payload.order_index,
        )
        db.add(file_resource)
        db.commit()
        db.refresh(file_resource)
        return file_payload(file_resource)

    @app.get("/api/contests", response_model=list[ContestOut])
    def list_contests(db: Session = Depends(db_dependency)) -> list[ContestOut]:
        return [contest_payload(item) for item in db.scalars(select(Contest).order_by(Contest.id)).all()]

    @app.get("/api/contests/{slug}", response_model=ContestOut)
    def get_contest(slug: str, db: Session = Depends(db_dependency)) -> ContestOut:
        contest = db.scalar(select(Contest).where(Contest.slug == slug))
        if contest is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
        return contest_payload(contest)

    @app.post("/api/admin/contests", response_model=ContestOut, status_code=status.HTTP_201_CREATED)
    def create_contest(
        payload: ContestCreate,
        _: User = Depends(require_admin),
        db: Session = Depends(db_dependency),
    ) -> ContestOut:
        if db.scalar(select(Contest).where(Contest.slug == payload.slug)) is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contest slug already exists")
        contest = Contest(
            slug=payload.slug,
            title=payload.title,
            description=payload.description,
            status=payload.status,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            problem_slugs_json=json_dumps_list(payload.problem_slugs),
        )
        db.add(contest)
        db.commit()
        db.refresh(contest)
        return contest_payload(contest)

    @app.get("/api/ratings", response_model=list[RatingEntryOut])
    def list_ratings(db: Session = Depends(db_dependency)) -> list[RatingEntryOut]:
        return [rating_payload(item) for item in db.scalars(select(RatingEntry).order_by(RatingEntry.rating.desc())).all()]

    @app.get("/api/submissions", response_model=list[SubmissionOut])
    def list_submissions(user: User = Depends(get_current_user), db: Session = Depends(db_dependency)) -> list[SubmissionOut]:
        query = select(Submission).where(Submission.user_id == user.id).order_by(Submission.id.desc())
        if user.role == "admin":
            query = select(Submission).order_by(Submission.id.desc())
        return [submission_payload(item) for item in db.scalars(query).all()]

    @app.post("/api/submissions", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
    def create_submission(
        payload: SubmissionCreate,
        user: User = Depends(get_current_user),
        db: Session = Depends(db_dependency),
    ) -> SubmissionOut:
        if payload.language != "cpp":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only C++ is supported in v1")
        problem = db.scalar(select(Problem).where(Problem.slug == payload.problem_slug))
        if problem is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
        submission = Submission(
            user_id=user.id,
            problem_id=problem.id,
            language=payload.language,
            source_code=payload.source_code,
            status="queued",
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
        threading.Thread(
            target=judge_service.evaluate_submission,
            args=(session_factory, submission.id, workspace_root),
            daemon=True,
        ).start()
        return submission_payload(submission)

    @app.get("/api/submissions/{submission_id}", response_model=SubmissionOut)
    def get_submission(
        submission_id: int,
        user: User = Depends(get_current_user),
        db: Session = Depends(db_dependency),
    ) -> SubmissionOut:
        submission = db.get(Submission, submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if submission.user_id != user.id and user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
        return submission_payload(submission)

    @app.get("/api/submissions/{submission_id}/events")
    def submission_events(
        submission_id: int,
        user: User = Depends(get_current_user),
        db: Session = Depends(db_dependency),
    ) -> StreamingResponse:
        submission = db.get(Submission, submission_id)
        if submission is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if submission.user_id != user.id and user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

        def event_stream():
            payload = event_hub.wait_for(submission_id)
            if payload is None:
                return
            envelope = submission_event_payload(payload)
            yield "event: submission\n"
            yield f"data: {json.dumps(envelope.model_dump(), ensure_ascii=False)}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    @app.get("/api/admin/summary", response_model=AdminSummaryOut)
    def admin_summary(_: User = Depends(require_admin), db: Session = Depends(db_dependency)) -> AdminSummaryOut:
        return AdminSummaryOut(
            problems=[problem_list_payload(item) for item in db.scalars(select(Problem).order_by(Problem.id)).all()],
            tutorials=[tutorial_payload(item) for item in db.scalars(select(Tutorial).order_by(Tutorial.order_index)).all()],
            files=[file_payload(item) for item in db.scalars(select(FileResource).order_by(FileResource.order_index)).all()],
            contests=[contest_payload(item) for item in db.scalars(select(Contest).order_by(Contest.id)).all()],
        )

    @app.get("/api/demo-auth", response_model=SeededAuthOut)
    def demo_auth(db: Session = Depends(db_dependency)) -> SeededAuthOut:
        user = db.scalar(select(User).where(User.email == "admin@algoteren.dev"))
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo account missing")
        return SeededAuthOut(user=UserOut.model_validate(user), demo_password="Admin123!")

    return app


app = create_app()
