from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .settings import Settings, get_settings


class Base(DeclarativeBase):
    pass


def build_engine(settings: Settings):
    connect_args = {}
    engine_kwargs = {"future": True}

    if settings.database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        if settings.database_url in {"sqlite://", "sqlite:///:memory:"}:
            engine_kwargs["poolclass"] = StaticPool

    return create_engine(settings.database_url, connect_args=connect_args, **engine_kwargs)


def build_session_factory(settings: Settings | None = None):
    resolved = settings or get_settings()
    engine = build_engine(resolved)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return engine, session_factory


def get_db(session_factory) -> Iterator[Session]:
    db = session_factory()
    try:
        yield db
    finally:
        db.close()

