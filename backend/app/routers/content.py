from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..dependencies import db_dependency
from ..models import Contest, FileResource, Problem, RatingEntry, Roadmap, Tutorial
from ..payloads import (
    contest_payload,
    dashboard_payload,
    file_payload,
    problem_detail_payload,
    problem_list_payload,
    rating_payload,
    roadmap_payload,
    tutorial_payload,
)
from ..schemas import (
    ContestOut,
    DashboardOut,
    FileResourceOut,
    MessageResponse,
    ProblemDetailOut,
    ProblemListOut,
    RatingEntryOut,
    RoadmapDetailOut,
    RoadmapOut,
    TutorialOut,
)

router = APIRouter(prefix="/api", tags=["content"])


@router.get("/health", response_model=MessageResponse)
def health() -> MessageResponse:
    return MessageResponse(message="ok")


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(db_dependency)) -> DashboardOut:
    return dashboard_payload(db)


@router.get("/roadmaps", response_model=list[RoadmapOut])
@router.get("/courses", response_model=list[RoadmapOut])
def list_courses(db: Session = Depends(db_dependency)) -> list[RoadmapOut]:
    return [roadmap_payload(item) for item in db.scalars(select(Roadmap).order_by(Roadmap.id)).all()]


@router.get("/roadmaps/{slug}", response_model=RoadmapDetailOut)
@router.get("/courses/{slug}", response_model=RoadmapDetailOut)
def get_course(slug: str, db: Session = Depends(db_dependency)) -> RoadmapDetailOut:
    roadmap = db.scalar(select(Roadmap).where(Roadmap.slug == slug))
    if roadmap is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    related_problems = [problem.slug for problem in db.scalars(select(Problem).order_by(Problem.id)).all()[:3]]
    related_tutorials = [tutorial.slug for tutorial in db.scalars(select(Tutorial).order_by(Tutorial.order_index)).all()[:3]]
    return RoadmapDetailOut(**roadmap_payload(roadmap).model_dump(), related_problems=related_problems, related_tutorials=related_tutorials)


@router.get("/problems", response_model=list[ProblemListOut])
def list_problems(collection: str | None = None, db: Session = Depends(db_dependency)) -> list[ProblemListOut]:
    query = select(Problem).order_by(Problem.id)
    if collection:
        query = query.where(Problem.collection == collection)
    return [problem_list_payload(item) for item in db.scalars(query).all()]


@router.get("/problems/{slug}", response_model=ProblemDetailOut)
def get_problem(slug: str, db: Session = Depends(db_dependency)) -> ProblemDetailOut:
    problem = db.scalar(select(Problem).where(Problem.slug == slug))
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return problem_detail_payload(problem)


@router.get("/tutorials", response_model=list[TutorialOut])
def list_tutorials(db: Session = Depends(db_dependency)) -> list[TutorialOut]:
    return [tutorial_payload(item) for item in db.scalars(select(Tutorial).order_by(Tutorial.order_index)).all()]


@router.get("/tutorials/{slug}", response_model=TutorialOut)
def get_tutorial(slug: str, db: Session = Depends(db_dependency)) -> TutorialOut:
    tutorial = db.scalar(select(Tutorial).where(Tutorial.slug == slug))
    if tutorial is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutorial not found")
    return tutorial_payload(tutorial)


@router.get("/files", response_model=list[FileResourceOut], deprecated=True)
def list_files(db: Session = Depends(db_dependency)) -> list[FileResourceOut]:
    return [file_payload(item) for item in db.scalars(select(FileResource).order_by(FileResource.order_index)).all()]


@router.get("/files/{slug}", response_model=FileResourceOut, deprecated=True)
def get_file(slug: str, db: Session = Depends(db_dependency)) -> FileResourceOut:
    file_resource = db.scalar(select(FileResource).where(FileResource.slug == slug))
    if file_resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return file_payload(file_resource)


@router.get("/contests", response_model=list[ContestOut])
def list_contests(db: Session = Depends(db_dependency)) -> list[ContestOut]:
    return [contest_payload(item) for item in db.scalars(select(Contest).order_by(Contest.id)).all()]


@router.get("/contests/{slug}", response_model=ContestOut)
def get_contest(slug: str, db: Session = Depends(db_dependency)) -> ContestOut:
    contest = db.scalar(select(Contest).where(Contest.slug == slug))
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contest not found")
    return contest_payload(contest)


@router.get("/ratings", response_model=list[RatingEntryOut])
def list_ratings(db: Session = Depends(db_dependency)) -> list[RatingEntryOut]:
    return [rating_payload(item) for item in db.scalars(select(RatingEntry).order_by(RatingEntry.rating.desc())).all()]
