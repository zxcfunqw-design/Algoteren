from __future__ import annotations

from datetime import timedelta

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import CSRF_COOKIE, TokenType, create_csrf_token, create_token, decode_token, extract_bearer_token


ACCESS_COOKIE = "algoteren_access_token"
REFRESH_COOKIE = "algoteren_refresh_token"


def db_dependency(request: Request):
    yield from get_db(request.app.state.session_factory)


def set_auth_cookies(response: Response, request: Request, user: User) -> None:
    settings = request.app.state.settings
    access_token = create_token(
        secret_key=settings.secret_key,
        subject=str(user.id),
        token_type=TokenType.ACCESS,
        expires_delta=timedelta(minutes=settings.access_token_minutes),
    )
    refresh_token = create_token(
        secret_key=settings.secret_key,
        subject=str(user.id),
        token_type=TokenType.REFRESH,
        expires_delta=timedelta(days=settings.refresh_token_days),
    )
    cookie_options = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "path": "/",
    }
    response.set_cookie(ACCESS_COOKIE, access_token, **cookie_options)
    response.set_cookie(REFRESH_COOKIE, refresh_token, **cookie_options)
    response.set_cookie(
        CSRF_COOKIE,
        create_csrf_token(),
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")


def get_current_user(request: Request, db: Session = Depends(db_dependency)) -> User:
    token = extract_bearer_token(request, ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token, secret_key=request.app.state.settings.secret_key, expected_type=TokenType.ACCESS)
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
