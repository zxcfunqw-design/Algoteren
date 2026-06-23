from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class MessageResponse(BaseModel):
    message: str


class AuthRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: str
    created_at: datetime


class RoadmapOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    summary: str
    track: str
    level: str
    steps: list[str]
    created_at: datetime


class RoadmapDetailOut(RoadmapOut):
    related_problems: list[str]
    related_tutorials: list[str]


class ProblemTestCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_index: int
    input_data: str
    expected_output: str
    is_sample: bool


class ProblemListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    collection: str
    title: str
    difficulty: str
    tags: list[str]
    time_limit_ms: int
    memory_limit_mb: int
    contest_id: int | None


class ProblemDetailOut(ProblemListOut):
    statement: str
    sample_input: str
    sample_output: str
    explanation: str
    test_cases: list[ProblemTestCaseOut]


class ProblemTestCaseCreate(BaseModel):
    order_index: int = 0
    input_data: str
    expected_output: str
    is_sample: bool = False


class ProblemCreate(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    collection: str = Field(pattern=r"^[a-z0-9-]+$")
    title: str
    statement: str
    difficulty: Literal["easy", "medium", "hard"]
    tags: list[str] = Field(default_factory=list)
    time_limit_ms: int = Field(default=1000, ge=100, le=10000)
    memory_limit_mb: int = Field(default=256, ge=32, le=2048)
    sample_input: str = ""
    sample_output: str = ""
    explanation: str = ""
    test_cases: list[ProblemTestCaseCreate] = Field(default_factory=list)


class TutorialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    summary: str
    body: str
    topic: str
    related_problem_slug: str | None
    order_index: int
    created_at: datetime


class TutorialCreate(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    title: str
    summary: str
    body: str
    topic: str
    related_problem_slug: str | None = None
    order_index: int = 0


class FileResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    description: str
    kind: str
    download_path: str
    order_index: int
    created_at: datetime


class FileResourceCreate(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    title: str
    description: str
    kind: str
    download_path: str
    order_index: int = 0


class ContestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    description: str
    status: str
    starts_at: datetime | None
    ends_at: datetime | None
    problem_slugs: list[str]
    created_at: datetime


class ContestCreate(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    title: str
    description: str
    status: str = "scheduled"
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    problem_slugs: list[str] = Field(default_factory=list)


class RatingEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    handle: str
    rating: int
    solved: int
    country: str
    trend: str
    created_at: datetime


class SubmissionCreate(BaseModel):
    problem_slug: str
    language: Literal["cpp"] = "cpp"
    source_code: str = Field(min_length=1, max_length=100_000)


class SubmissionTestResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_index: int
    input_data: str
    expected_output: str
    actual_output: str
    passed: bool
    status: str
    time_ms: int | None
    memory_kb: int | None
    notes: str


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    problem_id: int
    language: str
    status: str
    verdict: str | None
    compile_output: str
    runtime_ms: int | None
    memory_kb: int | None
    created_at: datetime
    finished_at: datetime | None
    source_code: str | None = None
    problem_slug: str | None = None
    test_results: list[SubmissionTestResultOut] = Field(default_factory=list)


class SubmissionEventOut(BaseModel):
    submission_id: int
    status: str
    verdict: str | None
    compile_output: str
    runtime_ms: int | None
    memory_kb: int | None
    test_results: list[SubmissionTestResultOut] = Field(default_factory=list)


class DashboardOut(BaseModel):
    roadmaps: list[RoadmapOut]
    contests: list[ContestOut]
    problems: list[ProblemListOut]
    tutorials: list[TutorialOut]
    files: list[FileResourceOut]
    ratings: list[RatingEntryOut]
    featured_problem: ProblemDetailOut | None = None


class SeededAuthOut(BaseModel):
    user: UserOut
    demo_password: str


class LoginResponse(BaseModel):
    user: UserOut


class SSEEnvelope(BaseModel):
    event: str
    data: SubmissionEventOut


class AdminSummaryOut(BaseModel):
    problems: list[ProblemListOut]
    tutorials: list[TutorialOut]
    files: list[FileResourceOut]
    contests: list[ContestOut]


class JudgeTestResultData(BaseModel):
    order_index: int
    input_data: str
    expected_output: str
    actual_output: str
    passed: bool
    status: str
    time_ms: int | None = None
    memory_kb: int | None = None
    notes: str = ""


class JudgeSubmissionData(BaseModel):
    submission_id: int
    status: str
    verdict: str | None
    compile_output: str
    runtime_ms: int | None
    memory_kb: int | None
    test_results: list[JudgeTestResultData] = Field(default_factory=list)
