import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_user, require_pin
from database import get_db
from models import Meal, MealIngredient, User
from schemas import MealCreate, MealUpdate

from meal_templates import get_meal_templates

router = APIRouter(prefix="/api/meals", tags=["meals"])

UPLOAD_DIR = Path("/uploads/meals")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def _meal_response(meal: Meal) -> dict:
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
        "id": meal.id,
        "name": meal.name,
        "categories": meal.categories or [],
        "image_path": meal.image_path,
        "servings": meal.servings,
        "max_per_week": meal.max_per_week,
        "ingredients": ingredients,
        "created_at": meal.created_at,
    }


@router.get("/ingredients/autocomplete")
async def ingredient_autocomplete(
    q: str = Query(default="", min_length=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return distinct ingredient names for autocomplete.
    Combines user's existing ingredients + template ingredients."""
    from sqlalchemy import distinct, func

    # Get user's existing ingredient names
    result = await db.execute(
        select(distinct(MealIngredient.name))
        .join(Meal, MealIngredient.meal_id == Meal.id)
        .where(Meal.user_id == current_user.id)
        .order_by(MealIngredient.name)
    )
    user_names = {row[0] for row in result}

    # Get template ingredient names
    template_names = set()
    for tmpl in get_meal_templates():
        for ing in tmpl.get("ingredients", []):
            template_names.add(ing["name"])

    # Combine and filter
    all_names = sorted(user_names | template_names)
    if q:
        q_lower = q.lower()
        all_names = [n for n in all_names if q_lower in n.lower()]

    return all_names[:50]


@router.get("")
async def list_meals(
    category: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Meal)
        .options(selectinload(Meal.ingredients))
        .where(Meal.user_id == current_user.id)
    )
    if category:
        query = query.where(Meal.categories.any(category))
    result = await db.execute(query.order_by(Meal.name))
    meals = result.scalars().unique().all()
    return [_meal_response(m) for m in meals]


@router.post("", status_code=201)
async def create_meal(
    data: MealCreate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    meal = Meal(
        user_id=current_user.id,
        name=data.name,
        categories=list(data.categories),
        servings=data.servings,
        max_per_week=data.max_per_week,
    )
    db.add(meal)
    await db.flush()

    for ing_data in data.ingredients:
        ingredient = MealIngredient(
            meal_id=meal.id,
            name=ing_data.name,
            quantity=ing_data.quantity,
            unit=ing_data.unit,
            category=ing_data.category,
        )
        db.add(ingredient)
    await db.flush()

    result = await db.execute(
        select(Meal)
        .options(selectinload(Meal.ingredients))
        .where(Meal.id == meal.id)
    )
    meal = result.scalar_one()
    return _meal_response(meal)


@router.post("/{meal_id}/image")
async def upload_meal_image(
    meal_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Meal).where(Meal.id == meal_id, Meal.user_id == current_user.id)
    )
    meal = result.scalar_one_or_none()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB.")

    # Delete old image if exists
    if meal.image_path:
        old_path = Path("/") / meal.image_path.lstrip("/")
        if old_path.exists():
            old_path.unlink()

    filename = f"{meal_id}{ext}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / filename
    with open(file_path, "wb") as f:
        f.write(content)

    meal.image_path = f"/uploads/meals/{filename}"
    await db.flush()

    return {"image_path": meal.image_path}


@router.get("/{meal_id}")
async def get_meal(
    meal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Meal)
        .options(selectinload(Meal.ingredients))
        .where(Meal.id == meal_id, Meal.user_id == current_user.id)
    )
    meal = result.scalar_one_or_none()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    return _meal_response(meal)


@router.put("/{meal_id}")
async def update_meal(
    meal_id: str,
    data: MealUpdate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Meal)
        .options(selectinload(Meal.ingredients))
        .where(Meal.id == meal_id, Meal.user_id == current_user.id)
    )
    meal = result.scalar_one_or_none()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    updates = data.model_dump(exclude_unset=True)
    ingredients_data = updates.pop("ingredients", None)

    for key, value in updates.items():
        if key == "categories" and value is not None:
            value = list(value)
        setattr(meal, key, value)

    if ingredients_data is not None:
        # Full replacement of ingredients
        for ing in list(meal.ingredients):
            await db.delete(ing)
        await db.flush()
        for ing_data in ingredients_data:
            ingredient = MealIngredient(
                meal_id=meal.id,
                name=ing_data["name"],
                quantity=ing_data["quantity"],
                unit=ing_data["unit"],
                category=ing_data["category"],
            )
            db.add(ingredient)
        await db.flush()

    # Re-fetch
    result = await db.execute(
        select(Meal)
        .options(selectinload(Meal.ingredients))
        .where(Meal.id == meal.id)
    )
    meal = result.scalar_one()
    return _meal_response(meal)


@router.delete("/{meal_id}", status_code=204)
async def delete_meal(
    meal_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Meal).where(Meal.id == meal_id, Meal.user_id == current_user.id)
    )
    meal = result.scalar_one_or_none()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    # Delete image file if exists
    if meal.image_path:
        file_path = Path("/") / meal.image_path.lstrip("/")
        if file_path.exists():
            file_path.unlink()

    await db.delete(meal)
    return None
