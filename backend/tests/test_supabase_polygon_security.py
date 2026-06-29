from __future__ import annotations

import pytest
from sqlalchemy.pool import NullPool

from app.database import build_engine
from app.integrations.polygon import PolygonClient, PolygonConfigError
from app.settings import Settings


def test_default_database_url_targets_supabase_postgres() -> None:
    settings = Settings()

    assert settings.database_url.startswith("postgresql+psycopg://")
    assert "pooler.supabase.com" in settings.database_url
    assert settings.seed_demo_data is False


def test_postgres_engine_uses_null_pool() -> None:
    settings = Settings(
        database_url="postgresql+psycopg://user:password@db.pooler.supabase.com:5432/postgres",
        secret_key="test-secret-key-with-32-bytes-minimum!",
    )

    engine = build_engine(settings)

    assert isinstance(engine.pool, NullPool)


def test_polygon_client_rejects_missing_or_fake_credentials() -> None:
    with pytest.raises(PolygonConfigError):
        PolygonClient(api_key="fake_key", api_secret="fake_key")


def test_polygon_signature_is_deterministic() -> None:
    client = PolygonClient(api_key="public", api_secret="secret")

    signature = client.build_signature(
        "problem.info",
        {"problemId": "42", "apiKey": "public", "time": "1000"},
        rand="abcdef",
    )

    assert signature.startswith("abcdef")
    assert len(signature) == 134


def test_cookie_authenticated_mutation_requires_csrf(client_factory) -> None:
    client, _ = client_factory()
    login = client.post("/api/auth/login", json={"email": "student@algoteren.dev", "password": "Student123!"})
    assert login.status_code == 200

    blocked = client.post(
        "/api/submissions",
        json={"problem_slug": "sum-two-numbers", "language": "cpp", "source_code": "int main(){return 0;}"},
    )
    assert blocked.status_code == 403

    csrf = client.cookies.get("algoteren_csrf_token")
    assert csrf
    allowed = client.post(
        "/api/submissions",
        headers={"x-csrf-token": csrf},
        json={"problem_slug": "sum-two-numbers", "language": "cpp", "source_code": "int main(){return 0;}"},
    )
    assert allowed.status_code == 201
