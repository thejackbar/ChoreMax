from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_pin
from database import get_db
from models import Child, TokenTransaction, User
from schemas import TokenAdjustmentRequest, TokenBalanceResponse, TokenTransactionListResponse, TokenTransactionResponse

router = APIRouter(prefix="/api/tokens", tags=["tokens"])


async def _get_balance(child_id: str, db: AsyncSession) -> dict:
    result = await db.execute(
        select(func.coalesce(func.sum(TokenTransaction.amount), 0))
        .where(TokenTransaction.child_id == child_id)
    )
    balance = int(result.scalar_one())

    result = await db.execute(
        select(func.coalesce(func.sum(TokenTransaction.amount), 0))
        .where(TokenTransaction.child_id == child_id, TokenTransaction.amount > 0)
    )
    total_earned = int(result.scalar_one())

    result = await db.execute(
        select(func.coalesce(func.sum(func.abs(TokenTransaction.amount)), 0))
        .where(TokenTransaction.child_id == child_id, TokenTransaction.amount < 0)
    )
    total_spent = int(result.scalar_one())

    return {
        "balance": balance,
        "total_earned": total_earned,
        "total_spent": total_spent,
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
    return TokenBalanceResponse(
        child_id=child_id,
        child_name=child.name,
        token_icon=child.token_icon,
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
        select(func.count()).select_from(TokenTransaction)
        .where(TokenTransaction.child_id == child_id)
    )
    total = count_result.scalar_one()

    # Fetch page
    offset = (page - 1) * per_page
    result = await db.execute(
        select(TokenTransaction)
        .where(TokenTransaction.child_id == child_id)
        .order_by(TokenTransaction.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    transactions = result.scalars().all()

    pages = (total + per_page - 1) // per_page if total > 0 else 1
    return TokenTransactionListResponse(
        transactions=[TokenTransactionResponse.model_validate(t) for t in transactions],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post("/adjust", status_code=201)
async def adjust_balance(
    data: TokenAdjustmentRequest,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child).where(Child.id == data.child_id, Child.user_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    if data.type == "subtract":
        balances = await _get_balance(data.child_id, db)
        if data.amount > balances["balance"]:
            raise HTTPException(status_code=400, detail="Insufficient balance")

    signed_amount = data.amount if data.type == "add" else -data.amount
    default_desc = "Manual adjustment (add)" if data.type == "add" else "Manual adjustment (subtract)"

    txn = TokenTransaction(
        child_id=data.child_id,
        type="adjustment",
        amount=signed_amount,
        description=data.description or default_desc,
    )
    db.add(txn)
    await db.flush()

    return TokenTransactionResponse.model_validate(txn)
