from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..dependencies import REFRESH_COOKIE, clear_auth_cookies, db_dependency, get_current_user, set_auth_cookies
from ..models import User
from ..schemas import AuthLoginRequest, AuthRegisterRequest, LoginResponse, MessageResponse, UserOut
from ..security import TokenType, decode_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=LoginResponse)
def register(payload: AuthRegisterRequest, request: Request, response: Response, db: Session = Depends(db_dependency)) -> LoginResponse:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password), role="student")
    db.add(user)
    db.commit()
    db.refresh(user)
    set_auth_cookies(response, request, user)
    return LoginResponse(user=UserOut.model_validate(user))


@router.post("/login", response_model=LoginResponse)
def login(payload: AuthLoginRequest, request: Request, response: Response, db: Session = Depends(db_dependency)) -> LoginResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    set_auth_cookies(response, request, user)
    return LoginResponse(user=UserOut.model_validate(user))


@router.post("/refresh", response_model=LoginResponse)
def refresh(request: Request, response: Response, db: Session = Depends(db_dependency)) -> LoginResponse:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")
    payload = decode_token(token, secret_key=request.app.state.settings.secret_key, expected_type=TokenType.REFRESH)
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user")
    set_auth_cookies(response, request, user)
    return LoginResponse(user=UserOut.model_validate(user))


@router.post("/logout", response_model=MessageResponse)
def logout(response: Response) -> MessageResponse:
    clear_auth_cookies(response)
    return MessageResponse(message="logged out")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)
