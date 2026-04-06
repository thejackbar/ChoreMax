from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import create_access_token, get_current_user, get_password_hash, verify_password
from config import settings
from database import get_db
from models import ReminderSetting, User
from schemas import LoginRequest, UserCreate, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "access_token"


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.JWT_EXPIRY_DAYS * 24 * 3600,
        path="/",
    )


def _user_response(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "currency": user.currency,
        "timezone": user.timezone,
        "family_size": user.family_size,
        "has_pin": user.pin_hash is not None,
        "created_at": user.created_at,
    }


@router.post("/register", status_code=201)
async def register(data: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=data.email.lower(),
        password_hash=get_password_hash(data.password),
        display_name=data.display_name,
    )
    db.add(user)
    await db.flush()

    # Create default reminder settings
    reminder = ReminderSetting(user_id=user.id)
    db.add(reminder)
    await db.flush()

    token = create_access_token(subject=user.id)
    _set_auth_cookie(response, token)
    resp = _user_response(user)
    resp["token"] = token  # Returned for Capacitor/iOS token-based auth
    return resp


@router.post("/login")
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(subject=user.id)
    _set_auth_cookie(response, token)
    resp = _user_response(user)
    resp["token"] = token  # Returned for Capacitor/iOS token-based auth
    return resp


@router.post("/logout", status_code=204)
async def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return None


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return _user_response(current_user)
