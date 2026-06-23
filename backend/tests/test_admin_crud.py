from __future__ import annotations


def test_admin_can_create_content(client_factory):
    client, _ = client_factory()

    client.post("/api/auth/login", json={"email": "admin@algoteren.dev", "password": "Admin123!"})

    problem = client.post(
        "/api/admin/problems",
        json={
            "slug": "pair-sum",
            "collection": "classics",
            "title": "Pair Sum",
            "statement": "Print the sum of two integers.",
            "difficulty": "easy",
            "tags": ["math", "implementation"],
            "time_limit_ms": 1000,
            "memory_limit_mb": 256,
            "sample_input": "1 4\n",
            "sample_output": "5\n",
            "explanation": "Use a simple addition and output the result.",
            "test_cases": [
                {"order_index": 0, "input_data": "1 4\n", "expected_output": "5\n", "is_sample": True}
            ],
        },
    )
    assert problem.status_code == 201
    assert problem.json()["slug"] == "pair-sum"

    tutorial = client.post(
        "/api/admin/tutorials",
        json={
            "slug": "pair-sum-note",
            "title": "Pair Sum Note",
            "summary": "A tiny practice note.",
            "body": "Solve pair sum with one read and one write.",
            "topic": "math",
            "related_problem_slug": "pair-sum",
            "order_index": 7,
        },
    )
    assert tutorial.status_code == 201
    assert tutorial.json()["related_problem_slug"] == "pair-sum"

    file_resource = client.post(
        "/api/admin/files",
        json={
            "slug": "pair-sum-template",
            "title": "Pair Sum Template",
            "description": "A mock template file.",
            "kind": "template",
            "download_path": "/static/files/pair-sum-template.txt",
            "order_index": 5,
        },
    )
    assert file_resource.status_code == 201
    assert file_resource.json()["slug"] == "pair-sum-template"

    contest = client.post(
        "/api/admin/contests",
        json={
            "slug": "spring-open",
            "title": "Spring Open",
            "description": "A mock contest.",
            "status": "scheduled",
            "problem_slugs": ["pair-sum"],
        },
    )
    assert contest.status_code == 201
    assert contest.json()["problem_slugs"] == ["pair-sum"]

    problems = client.get("/api/problems").json()
    assert any(item["slug"] == "pair-sum" for item in problems)

    tutorials = client.get("/api/tutorials").json()
    assert any(item["slug"] == "pair-sum-note" for item in tutorials)

    files = client.get("/api/files").json()
    assert any(item["slug"] == "pair-sum-template" for item in files)

