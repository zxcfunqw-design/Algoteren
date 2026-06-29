from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..dependencies import db_dependency, require_admin
from ..integrations.polygon import PolygonAPIError, PolygonClient, PolygonConfigError
from ..models import Contest, FileResource, Problem, ProblemTestCase, Tutorial, User
from ..payloads import contest_payload, file_payload, problem_detail_payload, problem_list_payload, tutorial_payload
from ..schemas import (
    AdminSummaryOut,
    ContestCreate,
    ContestOut,
    FileResourceCreate,
    FileResourceOut,
    PolygonProblemImportRequest,
    PolygonSyncResponse,
    ProblemCreate,
    ProblemDetailOut,
    TutorialCreate,
    TutorialOut,
)
from ..services import json_dumps_list

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "polygon-problem"


def _polygon_client(request: Request) -> PolygonClient:
    settings = request.app.state.settings
    try:
        return PolygonClient(
            api_key=settings.polygon_api_key,
            api_secret=settings.polygon_api_secret,
            base_url=settings.polygon_api_base_url,
        )
    except PolygonConfigError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


def _extract_tests(raw: dict[str, Any]) -> list[dict[str, str]]:
    items = raw.get("tests") or raw.get("items") or raw.get("testset") or []
    if not isinstance(items, list):
        return []
    tests: list[dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        input_data = str(item.get("input") or item.get("inputData") or item.get("input_data") or "")
        expected_output = str(item.get("output") or item.get("answer") or item.get("expectedOutput") or "")
        if input_data or expected_output:
            tests.append({"input_data": input_data, "expected_output": expected_output})
    return tests


@router.post("/problems", response_model=ProblemDetailOut, status_code=status.HTTP_201_CREATED)
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


@router.post("/tutorials", response_model=TutorialOut, status_code=status.HTTP_201_CREATED)
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


@router.post("/files", response_model=FileResourceOut, status_code=status.HTTP_201_CREATED, deprecated=True)
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


@router.post("/contests", response_model=ContestOut, status_code=status.HTTP_201_CREATED)
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


@router.get("/summary", response_model=AdminSummaryOut)
def admin_summary(_: User = Depends(require_admin), db: Session = Depends(db_dependency)) -> AdminSummaryOut:
    return AdminSummaryOut(
        problems=[problem_list_payload(item) for item in db.scalars(select(Problem).order_by(Problem.id)).all()],
        tutorials=[tutorial_payload(item) for item in db.scalars(select(Tutorial).order_by(Tutorial.order_index)).all()],
        files=[file_payload(item) for item in db.scalars(select(FileResource).order_by(FileResource.order_index)).all()],
        contests=[contest_payload(item) for item in db.scalars(select(Contest).order_by(Contest.id)).all()],
    )


@router.post("/polygon/problems/import", response_model=PolygonSyncResponse, status_code=status.HTTP_201_CREATED)
def import_polygon_problem(
    payload: PolygonProblemImportRequest,
    request: Request,
    _: User = Depends(require_admin),
    db: Session = Depends(db_dependency),
) -> PolygonSyncResponse:
    client = _polygon_client(request)
    try:
        info = client.problem_info(payload.polygon_id)
        statement = client.problem_statement(payload.polygon_id, language=payload.statement_language)
        tests_raw = client.problem_tests(payload.polygon_id)
    except PolygonAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    title = str(statement.get("name") or info.get("name") or f"Polygon {payload.polygon_id}")
    slug = _slugify(str(info.get("shortName") or title))
    if db.scalar(select(Problem).where(Problem.slug == slug)) is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Problem slug already exists")
    tests = _extract_tests(tests_raw)
    sample = tests[0] if tests else {"input_data": "", "expected_output": ""}
    problem = Problem(
        slug=slug,
        collection=payload.collection,
        title=title,
        statement=str(statement.get("statement") or statement.get("legend") or ""),
        difficulty=payload.difficulty,
        tags_json=json_dumps_list(["polygon"]),
        sample_input=sample["input_data"],
        sample_output=sample["expected_output"],
        explanation=str(statement.get("tutorial") or ""),
    )
    db.add(problem)
    db.flush()
    for index, test in enumerate(tests):
        db.add(
            ProblemTestCase(
                problem_id=problem.id,
                order_index=index,
                input_data=test["input_data"],
                expected_output=test["expected_output"],
                is_sample=index == 0,
            )
        )
    db.commit()
    db.refresh(problem)
    return PolygonSyncResponse(problem=problem_detail_payload(problem), imported_tests=len(tests))


@router.post("/polygon/problems/{polygon_id}/sync-tests", response_model=PolygonSyncResponse)
def sync_polygon_tests(
    polygon_id: int,
    request: Request,
    _: User = Depends(require_admin),
    db: Session = Depends(db_dependency),
) -> PolygonSyncResponse:
    client = _polygon_client(request)
    try:
        info = client.problem_info(polygon_id)
        tests = _extract_tests(client.problem_tests(polygon_id))
    except PolygonAPIError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    slug = _slugify(str(info.get("shortName") or info.get("name") or f"polygon-{polygon_id}"))
    problem = db.scalar(select(Problem).where(Problem.slug == slug))
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imported problem not found")
    problem.test_cases.clear()
    for index, test in enumerate(tests):
        problem.test_cases.append(
            ProblemTestCase(
                order_index=index,
                input_data=test["input_data"],
                expected_output=test["expected_output"],
                is_sample=index == 0,
            )
        )
    db.commit()
    db.refresh(problem)
    return PolygonSyncResponse(problem=problem_detail_payload(problem), imported_tests=len(tests))
