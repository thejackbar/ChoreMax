from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_pin
from database import get_db
from models import Child, TodoItem, User

router = APIRouter(prefix="/api/todos", tags=["todos"])


@router.get("")
async def list_todos(
    show_completed: bool = Query(default=False),
    category: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(TodoItem).where(TodoItem.user_id == current_user.id)
    if not show_completed:
        query = query.where(TodoItem.is_completed == False)
    if category:
        query = query.where(TodoItem.category == category)
    query = query.order_by(TodoItem.is_completed, TodoItem.priority.desc(), TodoItem.created_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()

    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "category": t.category,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "assigned_to": t.assigned_to,
            "assigned_name": None,
            "is_completed": t.is_completed,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "created_at": t.created_at.isoformat(),
        }
        for t in items
    ]


@router.post("")
async def create_todo(
    data: dict,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    todo = TodoItem(
        user_id=current_user.id,
        title=data["title"],
        description=data.get("description"),
        category=data.get("category", "general"),
        priority=data.get("priority", 0),
        due_date=date.fromisoformat(data["due_date"]) if data.get("due_date") else None,
        assigned_to=data.get("assigned_to"),
    )
    db.add(todo)
    await db.commit()
    await db.refresh(todo)
    return {"id": todo.id, "title": todo.title, "category": todo.category}


@router.put("/{todo_id}")
async def update_todo(
    todo_id: str,
    data: dict,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TodoItem).where(TodoItem.id == todo_id, TodoItem.user_id == current_user.id)
    )
    todo = result.scalar_one_or_none()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    for field in ["title", "description", "category", "priority", "assigned_to"]:
        if field in data:
            setattr(todo, field, data[field])
    if "due_date" in data:
        todo.due_date = date.fromisoformat(data["due_date"]) if data["due_date"] else None

    await db.commit()
    return {"id": todo.id, "title": todo.title}


@router.post("/{todo_id}/toggle")
async def toggle_todo(
    todo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TodoItem).where(TodoItem.id == todo_id, TodoItem.user_id == current_user.id)
    )
    todo = result.scalar_one_or_none()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    from datetime import datetime, timezone
    todo.is_completed = not todo.is_completed
    todo.completed_at = datetime.now(timezone.utc) if todo.is_completed else None
    await db.commit()
    return {"id": todo.id, "is_completed": todo.is_completed}


@router.delete("/{todo_id}", status_code=204)
async def delete_todo(
    todo_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TodoItem).where(TodoItem.id == todo_id, TodoItem.user_id == current_user.id)
    )
    todo = result.scalar_one_or_none()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    await db.delete(todo)
    await db.commit()
