from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_user, require_pin
from database import get_db
from models import Child, Chore, ChoreAssignment, ChoreCompletion, User
from schemas import ChoreCreate, ChoreResponse, ChoreUpdate, ChoreWithStatusResponse
from utils import get_period_date

router = APIRouter(prefix="/api/chores", tags=["chores"])


def _chore_response(chore: Chore, assignments: list[ChoreAssignment] | None = None) -> dict:
    child_ids = []
    if assignments is not None:
        child_ids = [a.child_id for a in assignments]
    elif hasattr(chore, "assignments") and chore.assignments:
        child_ids = [a.child_id for a in chore.assignments]
    return {
        "id": chore.id,
        "title": chore.title,
        "description": chore.description,
        "emoji": chore.emoji,
        "value": chore.value,
        "frequency": chore.frequency,
        "time_of_day": chore.time_of_day,
        "times_per_week": chore.times_per_week,
        "assignment_type": chore.assignment_type,
        "is_active": chore.is_active,
        "assigned_child_ids": child_ids,
        "created_at": chore.created_at,
    }


@router.get("")
async def list_chores(
    child_id: str | None = Query(default=None),
    frequency: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Chore)
        .options(selectinload(Chore.assignments))
        .where(Chore.user_id == current_user.id, Chore.is_active == True)
    )
    if frequency:
        query = query.where(Chore.frequency == frequency)
    result = await db.execute(query.order_by(Chore.created_at))
    chores = result.scalars().unique().all()

    if child_id:
        chores = [c for c in chores if any(a.child_id == child_id for a in c.assignments)]

    return [_chore_response(c) for c in chores]


@router.get("/templates")
async def get_templates():
    from chore_templates import get_templates as _get
    return _get()


@router.post("", status_code=201)
async def create_chore(
    data: ChoreCreate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    chore = Chore(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        emoji=data.emoji,
        value=data.value,
        frequency=data.frequency,
        time_of_day=data.time_of_day,
        times_per_week=data.times_per_week,
        assignment_type=data.assignment_type,
    )
    db.add(chore)
    await db.flush()

    # Assign to children
    if data.assigned_child_ids is not None:
        child_ids = data.assigned_child_ids
    else:
        # Assign to all children
        result = await db.execute(
            select(Child.id).where(Child.user_id == current_user.id)
        )
        child_ids = [row[0] for row in result.all()]

    assignments = []
    for cid in child_ids:
        assignment = ChoreAssignment(chore_id=chore.id, child_id=cid)
        db.add(assignment)
        assignments.append(assignment)
    await db.flush()

    return _chore_response(chore, assignments)


@router.get("/{chore_id}")
async def get_chore(
    chore_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chore)
        .options(selectinload(Chore.assignments))
        .where(Chore.id == chore_id, Chore.user_id == current_user.id)
    )
    chore = result.scalar_one_or_none()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")
    return _chore_response(chore)


@router.put("/{chore_id}")
async def update_chore(
    chore_id: str,
    data: ChoreUpdate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chore)
        .options(selectinload(Chore.assignments))
        .where(Chore.id == chore_id, Chore.user_id == current_user.id)
    )
    chore = result.scalar_one_or_none()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")

    updates = data.model_dump(exclude_unset=True)
    child_ids = updates.pop("assigned_child_ids", None)

    for key, value in updates.items():
        setattr(chore, key, value)

    if child_ids is not None:
        # Remove existing assignments and re-create
        for a in list(chore.assignments):
            await db.delete(a)
        await db.flush()
        for cid in child_ids:
            db.add(ChoreAssignment(chore_id=chore.id, child_id=cid))
        await db.flush()

    # Re-fetch assignments
    result = await db.execute(
        select(ChoreAssignment).where(ChoreAssignment.chore_id == chore.id)
    )
    assignments = result.scalars().all()
    return _chore_response(chore, list(assignments))


@router.delete("/{chore_id}", status_code=204)
async def delete_chore(
    chore_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chore).where(Chore.id == chore_id, Chore.user_id == current_user.id)
    )
    chore = result.scalar_one_or_none()
    if not chore:
        raise HTTPException(status_code=404, detail="Chore not found")
    await db.delete(chore)
    return None


@router.get("/child/{child_id}/daily")
async def child_daily_chores(
    child_id: str,
    for_date: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_child_chores(child_id, "daily", current_user, db, for_date=for_date)


@router.get("/child/{child_id}/weekly")
async def child_weekly_chores(
    child_id: str,
    for_date: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_child_chores(child_id, "weekly", current_user, db, for_date=for_date)


async def _get_child_chores(
    child_id: str,
    frequency: str,
    current_user: User,
    db: AsyncSession,
    for_date: date | None = None,
) -> list[dict]:
    # Verify child belongs to user
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    period_date = get_period_date(frequency, current_user.timezone, for_date=for_date)

    # Get chores assigned to this child
    result = await db.execute(
        select(Chore)
        .join(ChoreAssignment, Chore.id == ChoreAssignment.chore_id)
        .where(
            ChoreAssignment.child_id == child_id,
            Chore.user_id == current_user.id,
            Chore.frequency == frequency,
            Chore.is_active == True,
        )
        .order_by(Chore.title)
    )
    chores = result.scalars().all()

    # Get all completions for this period for these chores
    chore_ids = [c.id for c in chores]
    if chore_ids:
        result = await db.execute(
            select(ChoreCompletion)
            .join(Child, ChoreCompletion.child_id == Child.id)
            .where(
                ChoreCompletion.chore_id.in_(chore_ids),
                ChoreCompletion.period_date == period_date,
            )
        )
        completions = result.scalars().all()
    else:
        completions = []

    # Build completion lookup: chore_id -> list of completions
    completion_map: dict[str, list] = {}
    for comp in completions:
        completion_map.setdefault(comp.chore_id, []).append(comp)

    # Get child names for "completed by" display
    child_ids_in_completions = {comp.child_id for comp in completions}
    child_names = {}
    if child_ids_in_completions:
        result = await db.execute(
            select(Child).where(Child.id.in_(child_ids_in_completions))
        )
        for c in result.scalars().all():
            child_names[c.id] = c.name

    response = []
    for chore in chores:
        comps = completion_map.get(chore.id, [])

        # Determine max completions for this chore in this period
        if frequency == "weekly":
            max_completions = chore.times_per_week
        else:
            max_completions = 1  # daily: once per day

        if chore.assignment_type == "standalone":
            # Standalone: any child's completions count
            completions_done = len(comps)
            completed = completions_done >= max_completions
            completed_by = comps[0].child_id if comps else None
            completed_by_name = child_names.get(comps[0].child_id) if comps else None
            completion_id = comps[0].id if comps else None
        else:
            # Per-child: only this child's completions
            child_comps = [c for c in comps if c.child_id == child_id]
            completions_done = len(child_comps)
            completed = completions_done >= max_completions
            completed_by = child_comps[0].child_id if child_comps else None
            completed_by_name = child_names.get(child_comps[0].child_id) if child_comps else None
            # Return the most recent completion_id for undo purposes
            completion_id = child_comps[-1].id if child_comps else None

        response.append({
            "id": chore.id,
            "title": chore.title,
            "description": chore.description,
            "emoji": chore.emoji,
            "value": chore.value,
            "frequency": chore.frequency,
            "time_of_day": chore.time_of_day,
            "times_per_week": chore.times_per_week,
            "assignment_type": chore.assignment_type,
            "completed": completed,
            "completions_done": completions_done,
            "max_completions": max_completions,
            "completed_by": completed_by,
            "completed_by_name": completed_by_name,
            "completion_id": completion_id,
        })

    return response
