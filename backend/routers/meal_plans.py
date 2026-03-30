from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_user, require_pin
from database import get_db
from models import Meal, MealIngredient, MealPlanEntry, User
from schemas import MealPlanEntryCreate

router = APIRouter(prefix="/api/meal-plans", tags=["meal-plans"])


def _normalize_to_monday(d: date) -> date:
    """Normalize a date to the Monday of its week."""
    return d - __import__("datetime").timedelta(days=d.weekday())


def _entry_response(entry: MealPlanEntry) -> dict:
    meal = entry.meal
    ingredients = []
    if hasattr(meal, "ingredients") and meal.ingredients:
        ingredients = [
            {
                "id": ing.id,
                "name": ing.name,
                "quantity": ing.quantity,
                "unit": ing.unit,
                "category": ing.category,
            }
            for ing in meal.ingredients
        ]
    return {
        "id": entry.id,
        "week_start": entry.week_start,
        "day_of_week": entry.day_of_week,
        "slot": entry.slot,
        "meal": {
            "id": meal.id,
            "name": meal.name,
            "categories": meal.categories or [],
            "image_path": meal.image_path,
            "servings": meal.servings,
            "max_per_week": meal.max_per_week,
            "ingredients": ingredients,
            "created_at": meal.created_at,
        },
        "created_at": entry.created_at,
    }


@router.get("")
async def get_week_plan(
    week_start: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    monday = _normalize_to_monday(week_start)
    result = await db.execute(
        select(MealPlanEntry)
        .options(
            selectinload(MealPlanEntry.meal).selectinload(Meal.ingredients)
        )
        .where(
            MealPlanEntry.user_id == current_user.id,
            MealPlanEntry.week_start == monday,
        )
        .order_by(MealPlanEntry.day_of_week, MealPlanEntry.slot)
    )
    entries = result.scalars().unique().all()
    return {
        "week_start": monday,
        "entries": [_entry_response(e) for e in entries],
    }


@router.post("", status_code=201)
async def add_plan_entry(
    data: MealPlanEntryCreate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    monday = _normalize_to_monday(data.week_start)

    # Verify meal belongs to user
    result = await db.execute(
        select(Meal)
        .options(selectinload(Meal.ingredients))
        .where(Meal.id == data.meal_id, Meal.user_id == current_user.id)
    )
    meal = result.scalar_one_or_none()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    # Enforce max_per_week
    if meal.max_per_week is not None:
        result = await db.execute(
            select(func.count())
            .select_from(MealPlanEntry)
            .where(
                MealPlanEntry.user_id == current_user.id,
                MealPlanEntry.week_start == monday,
                MealPlanEntry.meal_id == data.meal_id,
            )
        )
        current_count = result.scalar() or 0
        if current_count >= meal.max_per_week:
            raise HTTPException(
                status_code=400,
                detail=f"{meal.name} can only be planned {meal.max_per_week} time(s) per week",
            )

    # Upsert: remove existing entry for this slot if any
    result = await db.execute(
        select(MealPlanEntry).where(
            MealPlanEntry.user_id == current_user.id,
            MealPlanEntry.week_start == monday,
            MealPlanEntry.day_of_week == data.day_of_week,
            MealPlanEntry.slot == data.slot,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()

    entry = MealPlanEntry(
        user_id=current_user.id,
        week_start=monday,
        day_of_week=data.day_of_week,
        slot=data.slot,
        meal_id=data.meal_id,
    )
    db.add(entry)
    await db.flush()

    # Re-fetch with meal loaded
    result = await db.execute(
        select(MealPlanEntry)
        .options(
            selectinload(MealPlanEntry.meal).selectinload(Meal.ingredients)
        )
        .where(MealPlanEntry.id == entry.id)
    )
    entry = result.scalar_one()
    return _entry_response(entry)


@router.delete("/{entry_id}", status_code=204)
async def remove_plan_entry(
    entry_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MealPlanEntry).where(
            MealPlanEntry.id == entry_id,
            MealPlanEntry.user_id == current_user.id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Plan entry not found")
    await db.delete(entry)
    return None
