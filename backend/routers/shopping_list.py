from collections import defaultdict
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_user, require_pin
from database import get_db
from models import Meal, MealIngredient, MealPlanEntry, ShoppingListCheck, User

router = APIRouter(prefix="/api/shopping-list", tags=["shopping-list"])


def _normalize_to_monday(d: date) -> date:
    return d - __import__("datetime").timedelta(days=d.weekday())


@router.get("")
async def get_shopping_list(
    week_start: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    monday = _normalize_to_monday(week_start)
    family_size = current_user.family_size

    # Get all plan entries for the week with ingredients
    result = await db.execute(
        select(MealPlanEntry)
        .options(
            selectinload(MealPlanEntry.meal).selectinload(Meal.ingredients)
        )
        .where(
            MealPlanEntry.user_id == current_user.id,
            MealPlanEntry.week_start == monday,
        )
    )
    entries = result.scalars().unique().all()

    # Aggregate ingredients scaled by family_size / servings
    # Key: (lowercase_name, unit) -> {category, total_quantity}
    aggregated: dict[tuple[str, str], dict] = defaultdict(
        lambda: {"category": "other", "total_quantity": Decimal("0")}
    )

    for entry in entries:
        meal = entry.meal
        if not meal.ingredients:
            continue
        scale = Decimal(str(family_size)) / Decimal(str(meal.servings))
        for ing in meal.ingredients:
            key = (ing.name.strip().lower(), ing.unit)
            item = aggregated[key]
            item["category"] = ing.category
            item["total_quantity"] += Decimal(str(ing.quantity)) * scale

    # Get check states
    result = await db.execute(
        select(ShoppingListCheck).where(
            ShoppingListCheck.user_id == current_user.id,
            ShoppingListCheck.week_start == monday,
        )
    )
    checks = result.scalars().all()
    check_map = {
        (c.ingredient_name.lower(), c.ingredient_unit): c.checked
        for c in checks
    }

    # Build response items sorted by category then name
    items = []
    for (name, unit), data in sorted(aggregated.items(), key=lambda x: (x[1]["category"], x[0][0])):
        qty = data["total_quantity"].quantize(Decimal("0.01"))
        items.append({
            "ingredient_name": name,
            "ingredient_unit": unit,
            "ingredient_category": data["category"],
            "total_quantity": qty,
            "checked": check_map.get((name, unit), False),
        })

    return {
        "week_start": monday,
        "family_size": family_size,
        "items": items,
    }


@router.post("/check")
async def toggle_check(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    monday = _normalize_to_monday(date.fromisoformat(data["week_start"]))
    ingredient_name = data["ingredient_name"].strip().lower()
    ingredient_unit = data["ingredient_unit"]
    checked = data["checked"]

    # Upsert check state
    result = await db.execute(
        select(ShoppingListCheck).where(
            ShoppingListCheck.user_id == current_user.id,
            ShoppingListCheck.week_start == monday,
            ShoppingListCheck.ingredient_name == ingredient_name,
            ShoppingListCheck.ingredient_unit == ingredient_unit,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.checked = checked
    else:
        check = ShoppingListCheck(
            user_id=current_user.id,
            week_start=monday,
            ingredient_name=ingredient_name,
            ingredient_unit=ingredient_unit,
            checked=checked,
        )
        db.add(check)

    await db.flush()
    return {"ok": True}


@router.delete("/checks", status_code=204)
async def clear_checks(
    week_start: date = Query(...),
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    monday = _normalize_to_monday(week_start)
    await db.execute(
        delete(ShoppingListCheck).where(
            ShoppingListCheck.user_id == current_user.id,
            ShoppingListCheck.week_start == monday,
        )
    )
    return None
