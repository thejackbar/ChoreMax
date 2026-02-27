from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_pin
from database import get_db
from models import Child, PiggyBankTransaction, User
from schemas import CashOutRequest, PiggyBankBalanceResponse, TransactionListResponse, TransactionResponse

router = APIRouter(prefix="/api/piggy-bank", tags=["piggy-bank"])


async def _get_balance(child_id: str, db: AsyncSession) -> dict:
    result = await db.execute(
        select(func.coalesce(func.sum(PiggyBankTransaction.amount), 0))
        .where(PiggyBankTransaction.child_id == child_id)
    )
    balance = result.scalar_one()

    result = await db.execute(
        select(func.coalesce(func.sum(PiggyBankTransaction.amount), 0))
        .where(PiggyBankTransaction.child_id == child_id, PiggyBankTransaction.amount > 0)
    )
    total_earned = result.scalar_one()

    result = await db.execute(
        select(func.coalesce(func.sum(func.abs(PiggyBankTransaction.amount)), 0))
        .where(PiggyBankTransaction.child_id == child_id, PiggyBankTransaction.amount < 0)
    )
    total_cashed_out = result.scalar_one()

    return {
        "balance": Decimal(str(balance)),
        "total_earned": Decimal(str(total_earned)),
        "total_cashed_out": Decimal(str(total_cashed_out)),
    }


@router.get("/{child_id}/balance")
async def get_balance(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    balances = await _get_balance(child_id, db)
    return PiggyBankBalanceResponse(
        child_id=child_id,
        child_name=child.name,
        **balances,
    )


@router.get("/{child_id}/transactions")
async def list_transactions(
    child_id: str,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Child not found")

    # Count total
    count_result = await db.execute(
        select(func.count()).select_from(PiggyBankTransaction)
        .where(PiggyBankTransaction.child_id == child_id)
    )
    total = count_result.scalar_one()

    # Fetch page
    offset = (page - 1) * per_page
    result = await db.execute(
        select(PiggyBankTransaction)
        .where(PiggyBankTransaction.child_id == child_id)
        .order_by(PiggyBankTransaction.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    transactions = result.scalars().all()

    pages = (total + per_page - 1) // per_page if total > 0 else 1
    return TransactionListResponse(
        transactions=[TransactionResponse.model_validate(t) for t in transactions],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post("/cash-out", status_code=201)
async def cash_out(
    data: CashOutRequest,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child).where(Child.id == data.child_id, Child.user_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    balances = await _get_balance(data.child_id, db)
    if data.amount > balances["balance"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    txn = PiggyBankTransaction(
        child_id=data.child_id,
        type="cash_out",
        amount=-data.amount,
        description=data.description or "Cash out",
    )
    db.add(txn)
    await db.flush()

    return TransactionResponse.model_validate(txn)
