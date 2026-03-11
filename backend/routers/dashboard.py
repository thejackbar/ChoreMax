from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_pin
from database import get_db
from models import Child, Chore, ChoreAssignment, ChoreCompletion, PiggyBankTransaction, Target, User
from schemas import (
    ChildDashboardResponse, ChildStatsResponse, ChoreWithStatusResponse,
    DetailedStatsResponse, ParentDashboardResponse, StatsDataPoint, TargetResponse,
)
from utils import get_period_date

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


async def _child_balance(child_id: str, db: AsyncSession) -> Decimal:
    result = await db.execute(
        select(func.coalesce(func.sum(PiggyBankTransaction.amount), 0))
        .where(PiggyBankTransaction.child_id == child_id)
    )
    return Decimal(str(result.scalar_one()))


async def _chore_counts(child_id: str, frequency: str, timezone: str, db: AsyncSession, for_date: date | None = None) -> tuple[int, int]:
    period_date = get_period_date(frequency, timezone, for_date=for_date)

    # Total assigned chores for this frequency
    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .join(Chore, ChoreAssignment.chore_id == Chore.id)
        .where(
            ChoreAssignment.child_id == child_id,
            Chore.frequency == frequency,
            Chore.is_active == True,
        )
    )
    total = result.scalar_one()

    # Completed count for this period
    result = await db.execute(
        select(func.count())
        .select_from(ChoreCompletion)
        .join(Chore, ChoreCompletion.chore_id == Chore.id)
        .where(
            ChoreCompletion.child_id == child_id,
            ChoreCompletion.period_date == period_date,
            Chore.frequency == frequency,
        )
    )
    completed = result.scalar_one()

    return completed, total


@router.get("/child/{child_id}")
async def child_dashboard(
    child_id: str,
    for_date: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    daily_completed, daily_total = await _chore_counts(child_id, "daily", current_user.timezone, db, for_date=for_date)
    weekly_completed, weekly_total = await _chore_counts(child_id, "weekly", current_user.timezone, db, for_date=for_date)
    balance = await _child_balance(child_id, db)

    # Active target
    result = await db.execute(
        select(Target).where(Target.child_id == child_id, Target.is_active == True)
    )
    target_obj = result.scalar_one_or_none()
    target = None
    if target_obj:
        progress_pct = float(balance / target_obj.target_value) if target_obj.target_value > 0 else 0.0
        target = TargetResponse(
            id=target_obj.id,
            child_id=target_obj.child_id,
            title=target_obj.title,
            target_type=target_obj.target_type,
            target_value=target_obj.target_value,
            emoji=target_obj.emoji,
            is_active=target_obj.is_active,
            achieved_at=target_obj.achieved_at,
            progress_amount=balance,
            progress_pct=round(min(max(progress_pct, 0.0), 1.0), 4),
            created_at=target_obj.created_at,
        )

    return ChildDashboardResponse(
        child_id=child_id,
        child_name=child.name,
        avatar_type=child.avatar_type,
        avatar_value=child.avatar_value,
        daily_completed=daily_completed,
        daily_total=daily_total,
        weekly_completed=weekly_completed,
        weekly_total=weekly_total,
        piggy_bank_balance=balance,
        target=target,
    )


@router.get("/parent")
async def parent_dashboard(
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child)
        .where(Child.user_id == current_user.id)
        .order_by(Child.display_order)
    )
    children = result.scalars().all()

    children_stats = []
    total_earnings = Decimal("0.00")
    total_completions = 0
    total_chores = 0

    for child in children:
        daily_completed, daily_total = await _chore_counts(child.id, "daily", current_user.timezone, db)
        weekly_completed, weekly_total = await _chore_counts(child.id, "weekly", current_user.timezone, db)
        balance = await _child_balance(child.id, db)

        child_total = daily_total + weekly_total
        child_completed = daily_completed + weekly_completed
        pct = (child_completed / child_total * 100) if child_total > 0 else 0.0

        children_stats.append(ChildStatsResponse(
            child_id=child.id,
            child_name=child.name,
            avatar_type=child.avatar_type,
            avatar_value=child.avatar_value,
            daily_completed=daily_completed,
            daily_total=daily_total,
            weekly_completed=weekly_completed,
            weekly_total=weekly_total,
            piggy_bank_balance=balance,
            completion_pct=round(pct, 1),
        ))
        total_earnings += balance
        total_completions += child_completed
        total_chores += child_total

    overall_pct = (total_completions / total_chores * 100) if total_chores > 0 else 0.0

    return ParentDashboardResponse(
        children_stats=children_stats,
        total_earnings=total_earnings,
        total_completions=total_completions,
        total_chores=total_chores,
        overall_completion_pct=round(overall_pct, 1),
    )


@router.get("/stats")
async def detailed_stats(
    period: str = Query(default="weekly"),
    child_id: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()

    if date_from and date_to:
        start = date.fromisoformat(date_from)
        end = date.fromisoformat(date_to)
    elif period == "daily":
        start = today - timedelta(days=6)
        end = today
    elif period == "weekly":
        start = today - timedelta(weeks=3)
        start = start - timedelta(days=start.weekday())
        end = today
    elif period == "monthly":
        start = today.replace(day=1) - timedelta(days=365)
        end = today
    elif period == "yearly":
        start = today.replace(month=1, day=1) - timedelta(days=365 * 2)
        end = today
    else:
        start = today - timedelta(days=6)
        end = today

    # Determine child name
    child_name = None
    if child_id:
        result = await db.execute(
            select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
        )
        child = result.scalar_one_or_none()
        if not child:
            raise HTTPException(status_code=404, detail="Child not found")
        child_name = child.name

    # Get completions in range
    query = (
        select(ChoreCompletion)
        .join(Child, ChoreCompletion.child_id == Child.id)
        .where(
            Child.user_id == current_user.id,
            ChoreCompletion.period_date >= start,
            ChoreCompletion.period_date <= end,
        )
    )
    if child_id:
        query = query.where(ChoreCompletion.child_id == child_id)

    result = await db.execute(query)
    completions = result.scalars().all()

    # Build data points by period
    data_points = []
    total_completed = 0
    total_earnings = Decimal("0.00")

    if period == "daily" or (date_from and date_to and (end - start).days <= 31):
        d = start
        while d <= end:
            day_comps = [c for c in completions if c.period_date == d]
            earnings = sum(Decimal(str(c.value_earned)) for c in day_comps)
            data_points.append(StatsDataPoint(
                label=d.strftime("%a %d/%m"),
                completed=len(day_comps),
                total=0,
                earnings=earnings,
            ))
            total_completed += len(day_comps)
            total_earnings += earnings
            d += timedelta(days=1)
    elif period == "weekly":
        d = start - timedelta(days=start.weekday())
        while d <= end:
            week_end = d + timedelta(days=6)
            week_comps = [c for c in completions if d <= c.period_date <= week_end]
            earnings = sum(Decimal(str(c.value_earned)) for c in week_comps)
            data_points.append(StatsDataPoint(
                label=f"W/C {d.strftime('%d/%m')}",
                completed=len(week_comps),
                total=0,
                earnings=earnings,
            ))
            total_completed += len(week_comps)
            total_earnings += earnings
            d += timedelta(weeks=1)
    elif period == "monthly":
        current = start.replace(day=1)
        while current <= end:
            next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
            month_comps = [c for c in completions if current <= c.period_date < next_month]
            earnings = sum(Decimal(str(c.value_earned)) for c in month_comps)
            data_points.append(StatsDataPoint(
                label=current.strftime("%b %Y"),
                completed=len(month_comps),
                total=0,
                earnings=earnings,
            ))
            total_completed += len(month_comps)
            total_earnings += earnings
            current = next_month
    else:
        current_year = start.year
        while current_year <= end.year:
            year_comps = [c for c in completions if c.period_date.year == current_year]
            earnings = sum(Decimal(str(c.value_earned)) for c in year_comps)
            data_points.append(StatsDataPoint(
                label=str(current_year),
                completed=len(year_comps),
                total=0,
                earnings=earnings,
            ))
            total_completed += len(year_comps)
            total_earnings += earnings
            current_year += 1

    total_chores = total_completed
    completion_pct = 100.0 if total_completed > 0 else 0.0

    return DetailedStatsResponse(
        child_id=child_id,
        child_name=child_name,
        period=period,
        data_points=data_points,
        total_completed=total_completed,
        total_chores=total_chores,
        total_earnings=total_earnings,
        completion_pct=round(completion_pct, 1),
    )


@router.get("/child/{child_id}/calendar")
async def child_calendar(
    child_id: str,
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    year, mo = int(month[:4]), int(month[5:7])
    start = date(year, mo, 1)
    if mo == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, mo + 1, 1) - timedelta(days=1)

    # Get total assigned chores for this child (daily)
    result = await db.execute(
        select(func.count())
        .select_from(ChoreAssignment)
        .join(Chore, ChoreAssignment.chore_id == Chore.id)
        .where(
            ChoreAssignment.child_id == child_id,
            Chore.frequency == "daily",
            Chore.is_active == True,
        )
    )
    daily_total = result.scalar_one()

    # Get completions in range
    result = await db.execute(
        select(
            ChoreCompletion.period_date,
            func.count().label("cnt"),
        )
        .join(Chore, ChoreCompletion.chore_id == Chore.id)
        .where(
            ChoreCompletion.child_id == child_id,
            ChoreCompletion.period_date >= start,
            ChoreCompletion.period_date <= end,
            Chore.frequency == "daily",
        )
        .group_by(ChoreCompletion.period_date)
    )
    completion_map = {row.period_date: row.cnt for row in result}

    days = []
    d = start
    while d <= end:
        completed = completion_map.get(d, 0)
        days.append({
            "date": d.isoformat(),
            "completed": completed,
            "total": daily_total,
        })
        d += timedelta(days=1)

    return {"month": month, "child_id": child_id, "daily_total": daily_total, "days": days}
