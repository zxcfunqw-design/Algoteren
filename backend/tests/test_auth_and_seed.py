from __future__ import annotations


def test_seeded_content_and_auth_flow(client_factory):
    client, _ = client_factory()

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["message"] == "ok"

    dashboard = client.get("/api/dashboard")
    assert dashboard.status_code == 200
    body = dashboard.json()
    assert len(body["roadmaps"]) >= 1
    assert len(body["problems"]) >= 1
    assert len(body["tutorials"]) >= 1
    assert len(body["files"]) >= 1
    assert len(body["ratings"]) >= 1

    register = client.post(
        "/api/auth/register",
        json={"email": "newstudent@example.com", "password": "Student123!"},
    )
    assert register.status_code == 200
    assert register.json()["user"]["email"] == "newstudent@example.com"

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "newstudent@example.com"

    forbidden = client.get("/api/admin/summary")
    assert forbidden.status_code == 403

    client.post("/api/auth/logout", headers={"x-csrf-token": client.cookies.get("algoteren_csrf_token")})

    login = client.post(
        "/api/auth/login",
        json={"email": "admin@algoteren.dev", "password": "Admin123!"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "admin"

    admin_summary = client.get("/api/admin/summary")
    assert admin_summary.status_code == 200
    summary = admin_summary.json()
    assert len(summary["problems"]) >= 1
    assert len(summary["tutorials"]) >= 1
