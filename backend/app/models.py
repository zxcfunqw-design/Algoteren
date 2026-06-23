from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="student")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    submissions: Mapped[list["Submission"]] = relationship(back_populates="user")


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)
    track: Mapped[str] = mapped_column(String(128))
    level: Mapped[str] = mapped_column(String(32))
    steps_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    collection: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(255))
    statement: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(32), index=True)
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    time_limit_ms: Mapped[int] = mapped_column(Integer, default=1000)
    memory_limit_mb: Mapped[int] = mapped_column(Integer, default=256)
    sample_input: Mapped[str] = mapped_column(Text, default="")
    sample_output: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    contest_id: Mapped[int | None] = mapped_column(ForeignKey("contests.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    test_cases: Mapped[list["ProblemTestCase"]] = relationship(
        back_populates="problem", cascade="all, delete-orphan", order_by="ProblemTestCase.order_index"
    )
    submissions: Mapped[list["Submission"]] = relationship(back_populates="problem")
    contest: Mapped["Contest | None"] = relationship(back_populates="problems")


class ProblemTestCase(Base):
    __tablename__ = "problem_test_cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id"), index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    input_data: Mapped[str] = mapped_column(Text)
    expected_output: Mapped[str] = mapped_column(Text)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)

    problem: Mapped[Problem] = relationship(back_populates="test_cases")


class Tutorial(Base):
    __tablename__ = "tutorials"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    topic: Mapped[str] = mapped_column(String(128), index=True)
    related_problem_slug: Mapped[str | None] = mapped_column(String(128), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class FileResource(Base):
    __tablename__ = "file_resources"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(64))
    download_path: Mapped[str] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Contest(Base):
    __tablename__ = "contests"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="scheduled")
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    problem_slugs_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    problems: Mapped[list[Problem]] = relationship(back_populates="contest")


class RatingEntry(Base):
    __tablename__ = "rating_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    handle: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    rating: Mapped[int] = mapped_column(Integer)
    solved: Mapped[int] = mapped_column(Integer)
    country: Mapped[str] = mapped_column(String(64))
    trend: Mapped[str] = mapped_column(String(32), default="steady")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problems.id"), index=True)
    language: Mapped[str] = mapped_column(String(32), default="cpp")
    source_code: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="queued")
    verdict: Mapped[str | None] = mapped_column(String(32), nullable=True)
    compile_output: Mapped[str] = mapped_column(Text, default="")
    runtime_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memory_kb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="submissions")
    problem: Mapped[Problem] = relationship(back_populates="submissions")
    test_results: Mapped[list["SubmissionTestResult"]] = relationship(
        back_populates="submission", cascade="all, delete-orphan", order_by="SubmissionTestResult.order_index"
    )


class SubmissionTestResult(Base):
    __tablename__ = "submission_test_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"), index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    input_data: Mapped[str] = mapped_column(Text)
    expected_output: Mapped[str] = mapped_column(Text)
    actual_output: Mapped[str] = mapped_column(Text, default="")
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memory_kb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")

    submission: Mapped[Submission] = relationship(back_populates="test_results")

