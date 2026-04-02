from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_pin
from database import get_db
from models import Child, WishlistItem, User

router = APIRouter(prefix="/api/wishlists", tags=["wishlists"])


@router.get("/{child_id}")
async def list_wishlist(
    child_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify child belongs to user
    result = await db.execute(
        select(Child).where(Child.id == child_id, Child.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Child not found")

    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.child_id == child_id)
        .order_by(WishlistItem.is_purchased, WishlistItem.created_at.desc())
    )
    items = result.scalars().all()

    return [
        {
            "id": w.id,
            "child_id": w.child_id,
            "title": w.title,
            "emoji": w.emoji,
            "url": w.url,
            "price": w.price,
            "notes": w.notes,
            "is_purchased": w.is_purchased,
            "created_at": w.created_at.isoformat(),
        }
        for w in items
    ]


@router.post("")
async def create_wishlist_item(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify child belongs to user
    result = await db.execute(
        select(Child).where(Child.id == data["child_id"], Child.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Child not found")

    item = WishlistItem(
        child_id=data["child_id"],
        title=data["title"],
        emoji=data.get("emoji", "\u2B50"),
        url=data.get("url"),
        price=data.get("price"),
        notes=data.get("notes"),
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"id": item.id, "title": item.title}


@router.put("/{item_id}")
async def update_wishlist_item(
    item_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(WishlistItem).where(WishlistItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Verify child belongs to user
    result = await db.execute(
        select(Child).where(Child.id == item.child_id, Child.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Not authorized")

    for field in ["title", "emoji", "url", "price", "notes"]:
        if field in data:
            setattr(item, field, data[field])

    await db.commit()
    return {"id": item.id, "title": item.title}


@router.post("/{item_id}/toggle")
async def toggle_purchased(
    item_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(WishlistItem).where(WishlistItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    result = await db.execute(
        select(Child).where(Child.id == item.child_id, Child.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Not authorized")

    item.is_purchased = not item.is_purchased
    await db.commit()
    return {"id": item.id, "is_purchased": item.is_purchased}


@router.delete("/{item_id}", status_code=204)
async def delete_wishlist_item(
    item_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(WishlistItem).where(WishlistItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    result = await db.execute(
        select(Child).where(Child.id == item.child_id, Child.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Not authorized")

    await db.delete(item)
    await db.commit()
