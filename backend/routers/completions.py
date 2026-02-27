from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_pin
from database import get_db
from models import Child, Chore, ChoreAssignment, ChoreCompletion, PiggyBankTransaction, User
from schemas import CompleteChoreRequest, CompletionResponse
from utils import get_period_date

router = APIRouter(prefix="/api/completions", tags=["completions"])


@router.post("", status_code=201)
async def complete_chore(
    data: CompleteChoreRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify child belongs to user
    result = await db.execute(
        select(Child).where(Child.id == data.child_id, Child.user_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    # Verify chore belongs to user and is active
    result = await db.execute(
        select(Chore).where(Chore.id == data.chore_id, Chore.user_id == current_user.id, Chore.is_active == True)
    )
    chore = result.scalar_one_or_none()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")

    # Verify child is assigned to this chore
    result = await db.execute(
        select(ChoreAssignment).where(
            ChoreAssignment.chore_id == chore.id,
            ChoreAssignment.child_id == child.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Child is not assigned to this chore")

    period_date = get_period_date(chore.frequency, current_user.timezone)

    # Check if already completed
    if chore.assignment_type == "standalone":
        # Only one child can complete per period
        result = await db.execute(
            select(ChoreCompletion).where(
                ChoreCompletion.chore_id == chore.id,
                ChoreCompletion.period_date == period_date,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="This chore has already been completed for this period")
    else:
        # Per-child: check this specific child
        result = await db.execute(
            select(ChoreCompletion).where(
                ChoreCompletion.chore_id == chore.id,
                ChoreCompletion.child_id == child.id,
                ChoreCompletion.period_date == period_date,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="This chore has already been completed")

    # Create completion
    completion = ChoreCompletion(
        chore_id=chore.id,
        child_id=child.id,
        period_date=period_date,
        value_earned=chore.value,
    )
    db.add(completion)
    await db.flush()

    # Create piggy bank transaction
    transaction = PiggyBankTransaction(
        child_id=child.id,
        type="chore_earning",
        amount=chore.value,
        description=f"Completed: {chore.title}",
        reference_id=completion.id,
    )
    db.add(transaction)
    await db.flush()

    return CompletionResponse.model_validate(completion)


@router.delete("/{completion_id}", status_code=204)
async def undo_completion(
    completion_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChoreCompletion)
        .join(Child, ChoreCompletion.child_id == Child.id)
        .where(ChoreCompletion.id == completion_id, Child.user_id == current_user.id)
    )
    completion = result.scalar_one_or_none()
    if not completion:
        raise HTTPException(status_code=404, detail="Completion not found")

    # Remove associated piggy bank transaction
    result = await db.execute(
        select(PiggyBankTransaction).where(PiggyBankTransaction.reference_id == completion.id)
    )
    txn = result.scalar_one_or_none()
    if txn:
        await db.delete(txn)

    await db.delete(completion)
    return None


@router.get("/child/{child_id}")
async def list_completions(
    child_id: str,
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify child belongs to user
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Child not found")

    query = select(ChoreCompletion).where(ChoreCompletion.child_id == child_id)
    if date_from:
        query = query.where(ChoreCompletion.period_date >= date_from)
    if date_to:
        query = query.where(ChoreCompletion.period_date <= date_to)

    query = query.order_by(ChoreCompletion.completed_at.desc())
    offset = (page - 1) * per_page
    result = await db.execute(query.offset(offset).limit(per_page))
    completions = result.scalars().all()

    return [CompletionResponse.model_validate(c) for c in completions]
