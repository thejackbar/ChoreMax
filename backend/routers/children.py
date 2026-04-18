from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_pin
from database import get_db
from models import Child, User
from schemas import ChildCreate, ChildReorderRequest, ChildResponse, ChildUpdate

router = APIRouter(prefix="/api/children", tags=["children"])


@router.get("")
async def list_children(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child)
        .where(Child.user_id == current_user.id)
        .order_by(Child.display_order, Child.created_at)
    )
    children = result.scalars().all()
    return [ChildResponse.model_validate(c) for c in children]


@router.post("", status_code=201)
async def create_child(
    data: ChildCreate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    # Get max display_order
    result = await db.execute(
        select(Child.display_order)
        .where(Child.user_id == current_user.id)
        .order_by(Child.display_order.desc())
        .limit(1)
    )
    max_order = result.scalar_one_or_none() or 0

    child = Child(
        user_id=current_user.id,
        name=data.name,
        avatar_type=data.avatar_type,
        avatar_value=data.avatar_value,
        display_order=max_order + 1,
        birthday=data.birthday,
        token_icon=data.token_icon,
        color=data.color,
        role=data.role,
        gender=data.gender,
    )
    db.add(child)
    await db.flush()
    return ChildResponse.model_validate(child)


@router.get("/{child_id}")
async def get_child(
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
    return ChildResponse.model_validate(child)


@router.put("/{child_id}")
async def update_child(
    child_id: str,
    data: ChildUpdate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(child, key, value)
    await db.flush()
    return ChildResponse.model_validate(child)


@router.delete("/{child_id}", status_code=204)
async def delete_child(
    child_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    await db.delete(child)
    return None


@router.put("/reorder", status_code=200)
async def reorder_children(
    data: ChildReorderRequest,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    for idx, child_id in enumerate(data.child_ids):
        result = await db.execute(
            select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
        )
        child = result.scalar_one_or_none()
        if child:
            child.display_order = idx
    await db.flush()
    return {"status": "ok"}
