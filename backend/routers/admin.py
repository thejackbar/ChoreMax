"""Admin auth - separate from user auth, for CMS access only."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Cookie, Depends
from jose import JWTError, jwt
from pydantic import BaseModel

from config import settings

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_TOKEN_EXPIRY_HOURS = 24


class AdminLoginRequest(BaseModel):
    email: str
    password: str


def _create_admin_token() -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=ADMIN_TOKEN_EXPIRY_HOURS)
    return jwt.encode({"sub": "admin", "exp": exp}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def require_admin(admin_token: str | None = Cookie(None)):
    """Dependency that verifies the admin session cookie."""
    if not admin_token:
        raise HTTPException(401, "Not authenticated as admin")
    try:
        payload = jwt.decode(admin_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("sub") != "admin":
            raise HTTPException(401, "Invalid admin token")
    except JWTError:
        raise HTTPException(401, "Invalid or expired admin token")
    return True


@router.post("/login")
async def admin_login(data: AdminLoginRequest):
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        raise HTTPException(403, "Admin access not configured")
    if data.email != settings.ADMIN_EMAIL or data.password != settings.ADMIN_PASSWORD:
        raise HTTPException(401, "Invalid credentials")

    token = _create_admin_token()
    from fastapi.responses import JSONResponse
    resp = JSONResponse({"message": "Admin login successful"})
    resp.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=ADMIN_TOKEN_EXPIRY_HOURS * 3600,
        path="/",
    )
    return resp


@router.post("/logout")
async def admin_logout():
    from fastapi.responses import JSONResponse
    resp = JSONResponse({"message": "Logged out"})
    resp.delete_cookie("admin_token", path="/")
    return resp


@router.get("/verify")
async def verify_admin(_=Depends(require_admin)):
    return {"authenticated": True}
