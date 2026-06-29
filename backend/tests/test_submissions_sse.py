from __future__ import annotations

from conftest import build_cpp_runner


def test_submission_completes_and_pushes_sse(client_factory):
    runner = build_cpp_runner(
        {
            "1 2\n": "3\n",
            "10 15\n": "25\n",
        }
    )
    client, _ = client_factory(runner=runner)

    client.post("/api/auth/login", json={"email": "student@algoteren.dev", "password": "Student123!"})
    headers = {"x-csrf-token": client.cookies.get("algoteren_csrf_token")}

    create = client.post(
        "/api/submissions",
        headers=headers,
        json={
            "problem_slug": "sum-two-numbers",
            "language": "cpp",
            "source_code": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){ios::sync_with_stdio(false);cin.tie(nullptr);long long a,b; if(!(cin>>a>>b)) return 0; cout << a+b << '\\n';}\n",
        },
    )
    assert create.status_code == 201
    submission_id = create.json()["id"]

    events = client.get(f"/api/submissions/{submission_id}/events")
    assert events.status_code == 200
    assert events.headers["content-type"].startswith("text/event-stream")
    assert "event: submission" in events.text
    assert '"verdict": "accepted"' in events.text

    detail = client.get(f"/api/submissions/{submission_id}")
    assert detail.status_code == 200
    payload = detail.json()
    assert payload["verdict"] == "accepted"
    assert len(payload["test_results"]) == 2
