from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_user, require_pin
from database import get_db
from models import Meal, MealPlanEntry, ShoppingListCheck, User

router = APIRouter(prefix="/api/shopping-list", tags=["shopping-list"])


def _normalize_to_monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


async def _aggregate_for_week(db: AsyncSession, user: User, monday: date):
    """Aggregate ingredients across the week's meal plan. Honours the user's
    `auto_add_ingredients_to_list` setting - if disabled, returns {}."""
    if not getattr(user, "auto_add_ingredients_to_list", True):
        return {}

    result = await db.execute(
        select(MealPlanEntry)
        .options(selectinload(MealPlanEntry.meal).selectinload(Meal.ingredients))
        .where(
            MealPlanEntry.user_id == user.id,
            MealPlanEntry.week_start == monday,
        )
    )
    entries = result.scalars().unique().all()

    aggregated: dict[tuple[str, str], dict] = defaultdict(
        lambda: {"category": "other", "total_quantity": Decimal("0")}
    )
    family_size = user.family_size
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
    return aggregated


@router.get("")
async def get_shopping_list(
    week_start: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    monday = _normalize_to_monday(week_start)
    aggregated = await _aggregate_for_week(db, current_user, monday)

    # Get check / hidden states
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

    # Build response items. Items that have been ticked/removed
    # (checked=True) are filtered out - once ticked they stay gone.
    items = []
    for (name, unit), data in sorted(aggregated.items(), key=lambda x: (x[1]["category"], x[0][0])):
        if check_map.get((name, unit), False):
            continue  # permanently removed
        qty = data["total_quantity"].quantize(Decimal("0.01"))
        items.append({
            "ingredient_name": name,
            "ingredient_unit": unit,
            "ingredient_category": data["category"],
            "total_quantity": qty,
            "checked": False,
        })

    return {
        "week_start": monday,
        "family_size": current_user.family_size,
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
    checked = bool(data["checked"])

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


@router.post("/remove-all", status_code=204)
async def remove_all_items(
    week_start: date = Query(...),
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    """Remove every item from the list for this week (bulk 'remove all')."""
    monday = _normalize_to_monday(week_start)
    aggregated = await _aggregate_for_week(db, current_user, monday)
    if not aggregated:
        return None

    rows = [
        {
            "user_id": current_user.id,
            "week_start": monday,
            "ingredient_name": name,
            "ingredient_unit": unit,
            "checked": True,
        }
        for (name, unit) in aggregated.keys()
    ]
    stmt = pg_insert(ShoppingListCheck).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "week_start", "ingredient_name", "ingredient_unit"],
        set_={"checked": True},
    )
    await db.execute(stmt)
    return None
