from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_pin
from database import get_db
from models import Child, GoalActivity, GoalRedemption, TokenTransaction, User
from schemas import (
    GoalActivityCreate, GoalActivityResponse, GoalActivityUpdate,
    GoalRedeemRequest, GoalRedemptionResponse,
)

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.get("")
async def list_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GoalActivity)
        .where(GoalActivity.user_id == current_user.id, GoalActivity.is_active == True)
        .order_by(GoalActivity.token_cost)
    )
    goals = result.scalars().all()
    return [GoalActivityResponse.model_validate(g) for g in goals]


@router.get("/all")
async def list_all_goals(
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    """List all goals including inactive ones (for parent management)."""
    result = await db.execute(
        select(GoalActivity)
        .where(GoalActivity.user_id == current_user.id)
        .order_by(GoalActivity.token_cost)
    )
    goals = result.scalars().all()
    return [GoalActivityResponse.model_validate(g) for g in goals]


@router.post("", status_code=201)
async def create_goal(
    data: GoalActivityCreate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    goal = GoalActivity(
        user_id=current_user.id,
        title=data.title,
        token_cost=data.token_cost,
        emoji=data.emoji,
    )
    db.add(goal)
    await db.flush()
    return GoalActivityResponse.model_validate(goal)


@router.put("/{goal_id}")
async def update_goal(
    goal_id: str,
    data: GoalActivityUpdate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GoalActivity).where(
            GoalActivity.id == goal_id, GoalActivity.user_id == current_user.id
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(goal, key, value)
    await db.flush()

    return GoalActivityResponse.model_validate(goal)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GoalActivity).where(
            GoalActivity.id == goal_id, GoalActivity.user_id == current_user.id
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    return None


@router.post("/{goal_id}/redeem", status_code=201)
async def redeem_goal(
    goal_id: str,
    data: GoalRedeemRequest,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    # Verify goal
    result = await db.execute(
        select(GoalActivity).where(
            GoalActivity.id == goal_id,
            GoalActivity.user_id == current_user.id,
            GoalActivity.is_active == True,
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Verify child
    result = await db.execute(
        select(Child).where(Child.id == data.child_id, Child.user_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    # Check balance
    result = await db.execute(
        select(func.coalesce(func.sum(TokenTransaction.amount), 0))
        .where(TokenTransaction.child_id == child.id)
    )
    balance = int(result.scalar_one())

    if balance < goal.token_cost:
        raise HTTPException(status_code=400, detail="Insufficient tokens")

    # Create redemption
    redemption = GoalRedemption(
        child_id=child.id,
        goal_activity_id=goal.id,
        tokens_spent=goal.token_cost,
    )
    db.add(redemption)

    # Create token transaction (negative)
    txn = TokenTransaction(
        child_id=child.id,
        type="redemption",
        amount=-goal.token_cost,
        description=f"Redeemed: {goal.title}",
        reference_id=redemption.id,
    )
    db.add(txn)
    await db.flush()

    return {
        "id": redemption.id,
        "child_id": redemption.child_id,
        "goal_activity_id": redemption.goal_activity_id,
        "tokens_spent": redemption.tokens_spent,
        "redeemed_at": redemption.redeemed_at,
        "goal_title": goal.title,
        "goal_emoji": goal.emoji,
    }


@router.get("/redemptions/{child_id}")
async def list_redemptions(
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

    result = await db.execute(
        select(GoalRedemption, GoalActivity)
        .join(GoalActivity, GoalRedemption.goal_activity_id == GoalActivity.id)
        .where(GoalRedemption.child_id == child_id)
        .order_by(GoalRedemption.redeemed_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = result.all()

    return [
        {
            "id": r.id,
            "child_id": r.child_id,
            "goal_activity_id": r.goal_activity_id,
            "tokens_spent": r.tokens_spent,
            "redeemed_at": r.redeemed_at,
            "goal_title": g.title,
            "goal_emoji": g.emoji,
        }
        for r, g in rows
    ]
