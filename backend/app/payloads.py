from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Contest, FileResource, Problem, RatingEntry, Roadmap, Submission, Tutorial
from .schemas import (
    ContestOut,
    DashboardOut,
    FileResourceOut,
    ProblemDetailOut,
    ProblemListOut,
    ProblemTestCaseOut,
    RatingEntryOut,
    RoadmapOut,
    SubmissionOut,
    SubmissionTestResultOut,
    TutorialOut,
)
from .services import json_loads_list


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
