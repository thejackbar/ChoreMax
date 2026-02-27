from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_pin
from database import get_db
from models import Child, PiggyBankTransaction, Target, User
from schemas import TargetCreate, TargetResponse, TargetUpdate

router = APIRouter(prefix="/api/targets", tags=["targets"])


async def _get_balance(child_id: str, db: AsyncSession) -> Decimal:
    result = await db.execute(
        select(func.coalesce(func.sum(PiggyBankTransaction.amount), 0))
        .where(PiggyBankTransaction.child_id == child_id)
    )
    return Decimal(str(result.scalar_one()))


def _target_response(target: Target, balance: Decimal) -> dict:
    progress_pct = float(balance / target.target_value) if target.target_value > 0 else 0.0
    progress_pct = min(progress_pct, 1.0)
    progress_pct = max(progress_pct, 0.0)
    return {
        "id": target.id,
        "child_id": target.child_id,
        "title": target.title,
        "target_type": target.target_type,
        "target_value": target.target_value,
        "emoji": target.emoji,
        "is_active": target.is_active,
        "achieved_at": target.achieved_at,
        "progress_amount": balance,
        "progress_pct": round(progress_pct, 4),
        "created_at": target.created_at,
    }


@router.get("/child/{child_id}")
async def get_active_target(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Child not found")

    result = await db.execute(
        select(Target).where(Target.child_id == child_id, Target.is_active == True)
    )
    target = result.scalar_one_or_none()
    if not target:
        return None

    balance = await _get_balance(child_id, db)
    return _target_response(target, balance)


@router.post("", status_code=201)
async def create_target(
    data: TargetCreate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child).where(Child.id == data.child_id, Child.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Child not found")

    # Deactivate existing active targets for this child (v1: single active target)
    result = await db.execute(
        select(Target).where(Target.child_id == data.child_id, Target.is_active == True)
    )
    for existing in result.scalars().all():
        existing.is_active = False

    target = Target(
        child_id=data.child_id,
        title=data.title,
        target_type=data.target_type,
        target_value=data.target_value,
        emoji=data.emoji,
    )
    db.add(target)
    await db.flush()

    balance = await _get_balance(data.child_id, db)
    return _target_response(target, balance)


@router.put("/{target_id}")
async def update_target(
    target_id: str,
    data: TargetUpdate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Target)
        .join(Child, Target.child_id == Child.id)
        .where(Target.id == target_id, Child.user_id == current_user.id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(target, key, value)
    await db.flush()

    balance = await _get_balance(target.child_id, db)
    return _target_response(target, balance)


@router.post("/{target_id}/achieve", status_code=200)
async def achieve_target(
    target_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Target)
        .join(Child, Target.child_id == Child.id)
        .where(Target.id == target_id, Child.user_id == current_user.id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    target.is_active = False
    target.achieved_at = datetime.now(timezone.utc)

    # Create cash-out transaction for the target value
    txn = PiggyBankTransaction(
        child_id=target.child_id,
        type="cash_out",
        amount=-target.target_value,
        description=f"Target achieved: {target.title}",
        reference_id=target.id,
    )
    db.add(txn)
    await db.flush()

    balance = await _get_balance(target.child_id, db)
    return _target_response(target, balance)


@router.delete("/{target_id}", status_code=204)
async def delete_target(
    target_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Target)
        .join(Child, Target.child_id == Child.id)
        .where(Target.id == target_id, Child.user_id == current_user.id)
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    await db.delete(target)
    return None
