from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, get_password_hash, hash_pin, require_pin, verify_password, verify_pin
from database import get_db
from models import ReminderSetting, User
from schemas import (
    PasswordChangeRequest, PinSetRequest, PinVerifyRequest,
    ReminderSettingsResponse, ReminderSettingsUpdate, SettingsUpdate, UserResponse,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.post("/pin/set")
async def set_pin(
    data: PinSetRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.pin_hash = hash_pin(data.pin)
    await db.flush()
    return {"status": "ok", "has_pin": True}


@router.post("/pin/verify")
async def verify_pin_endpoint(
    data: PinVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.pin_hash:
        raise HTTPException(status_code=400, detail="PIN not set")
    if not verify_pin(data.pin, current_user.pin_hash):
        raise HTTPException(status_code=403, detail="Invalid PIN")
    return {"status": "ok"}


@router.put("/account")
async def update_account(
    data: SettingsUpdate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(current_user, key, value)
    await db.flush()
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        currency=current_user.currency,
        timezone=current_user.timezone,
        has_pin=current_user.pin_hash is not None,
        created_at=current_user.created_at,
    )


@router.post("/change-password")
async def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = get_password_hash(data.new_password)
    await db.flush()
    return {"status": "ok"}


@router.get("/reminders")
async def get_reminders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReminderSetting).where(ReminderSetting.user_id == current_user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        reminder = ReminderSetting(user_id=current_user.id)
        db.add(reminder)
        await db.flush()

    return ReminderSettingsResponse(
        morning_enabled=reminder.morning_enabled,
        morning_time=str(reminder.morning_time),
        evening_enabled=reminder.evening_enabled,
        evening_time=str(reminder.evening_time),
    )


@router.put("/reminders")
async def update_reminders(
    data: ReminderSettingsUpdate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ReminderSetting).where(ReminderSetting.user_id == current_user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        reminder = ReminderSetting(user_id=current_user.id)
        db.add(reminder)
        await db.flush()

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(reminder, key, value)
    await db.flush()

    return ReminderSettingsResponse(
        morning_enabled=reminder.morning_enabled,
        morning_time=str(reminder.morning_time),
        evening_enabled=reminder.evening_enabled,
        evening_time=str(reminder.evening_time),
    )
