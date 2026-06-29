from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..dependencies import db_dependency, get_current_user
from ..models import Problem, Submission, User
from ..payloads import submission_payload
from ..schemas import SubmissionCreate, SubmissionEventOut, SubmissionOut

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


@router.get("", response_model=list[SubmissionOut])
def list_submissions(user: User = Depends(get_current_user), db: Session = Depends(db_dependency)) -> list[SubmissionOut]:
    query = select(Submission).where(Submission.user_id == user.id).order_by(Submission.id.desc())
    if user.role == "admin":
        query = select(Submission).order_by(Submission.id.desc())
    return [submission_payload(item) for item in db.scalars(query).all()]


@router.post("", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
def create_submission(
    payload: SubmissionCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(db_dependency),
) -> SubmissionOut:
    if payload.language != "cpp":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only C++ is supported")
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
    request.app.state.submission_executor.submit(
        request.app.state.judge_service.evaluate_submission,
        request.app.state.session_factory,
        submission.id,
        request.app.state.workspace_root,
    )
    return submission_payload(submission)


@router.get("/{submission_id}", response_model=SubmissionOut)
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


@router.get("/{submission_id}/events")
def submission_events(
    submission_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(db_dependency),
) -> StreamingResponse:
    submission = db.get(Submission, submission_id)
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if submission.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    def event_stream():
        payload = request.app.state.event_hub.wait_for(submission_id)
        if payload is None:
            return
        envelope = SubmissionEventOut.model_validate(payload)
        yield "event: submission\n"
        yield f"data: {json.dumps(envelope.model_dump(), ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
