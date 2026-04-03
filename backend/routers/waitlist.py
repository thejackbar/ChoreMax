"""Waitlist endpoint - public, no auth required."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import WaitlistEntry
from schemas import WaitlistRequest

router = APIRouter(prefix="/api/waitlist", tags=["waitlist"])


@router.post("", status_code=201)
async def join_waitlist(data: WaitlistRequest, db: AsyncSession = Depends(get_db)):
    # Check for duplicate email
    existing = await db.execute(
        select(WaitlistEntry).where(WaitlistEntry.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "This email is already on the waitlist!")

    entry = WaitlistEntry(
        name=data.name,
        email=data.email,
        feature=data.feature,
    )
    db.add(entry)
    await db.flush()
    return {"message": "You're on the list! We'll be in touch soon."}
