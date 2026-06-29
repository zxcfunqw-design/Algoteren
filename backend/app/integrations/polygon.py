from __future__ import annotations

import hashlib
import secrets
import time
from typing import Any
from urllib.parse import urlencode

import httpx2


class PolygonConfigError(RuntimeError):
    pass


class PolygonAPIError(RuntimeError):
    pass


class PolygonClient:
    def __init__(self, *, api_key: str, api_secret: str, base_url: str = "https://polygon.codeforces.com/api/") -> None:
        if api_key == "fake_key" or api_secret == "fake_key" or not api_key or not api_secret:
            raise PolygonConfigError("Polygon API credentials are not configured")
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = base_url.rstrip("/") + "/"

    def build_signature(self, method: str, params: dict[str, Any], *, rand: str | None = None) -> str:
        prefix = rand or secrets.token_hex(3)
        normalized = {key: str(value) for key, value in params.items() if value is not None}
        query = urlencode(sorted(normalized.items()))
        raw = f"{prefix}/{method}?{query}#{self.api_secret}"
        digest = hashlib.sha512(raw.encode("utf-8")).hexdigest()
        return f"{prefix}{digest}"

    def call(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = dict(params or {})
        payload["apiKey"] = self.api_key
        payload["time"] = int(time.time())
        payload["apiSig"] = self.build_signature(method, payload)
        response = httpx2.get(f"{self.base_url}{method}", params=payload, timeout=20)
        response.raise_for_status()
        body = response.json()
        if body.get("status") != "OK":
            comment = body.get("comment") or "Polygon API request failed"
            raise PolygonAPIError(str(comment))
        result = body.get("result")
        return result if isinstance(result, dict) else {"items": result}

    def problem_info(self, polygon_id: int) -> dict[str, Any]:
        return self.call("problem.info", {"problemId": polygon_id})

    def problem_statement(self, polygon_id: int, *, language: str = "english") -> dict[str, Any]:
        return self.call("problem.statement", {"problemId": polygon_id, "language": language})

    def problem_tests(self, polygon_id: int) -> dict[str, Any]:
        return self.call("problem.tests", {"problemId": polygon_id})
