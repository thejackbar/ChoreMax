"""Calendar integration router - Google Calendar + iCal feeds."""

import asyncio
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user, require_pin
from calendar_sync import (
    decrypt_token, encrypt_token, exchange_google_code,
    get_google_auth_url, get_google_email, sync_connection,
)
from config import settings
from database import get_db
from models import (
    CalendarConnection, CalendarEvent, Child, Chore, ChoreAssignment,
    ChoreCompletion, Meal, MealPlanEntry, User,
)
from schemas import (
    CalendarConnectionCreate, CalendarConnectionResponse,
    CalendarConnectionUpdate, CalendarDayResponse, CalendarEventResponse,
)
from utils import get_period_date

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


# ---------------------------------------------------------------------------
# Connection management
# ---------------------------------------------------------------------------

@router.get("/connections")
async def list_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CalendarConnection)
        .where(CalendarConnection.user_id == current_user.id)
        .order_by(CalendarConnection.created_at)
    )
    conns = result.scalars().all()
    return [CalendarConnectionResponse.model_validate(c) for c in conns]


@router.post("/connections", status_code=201)
async def create_connection(
    data: CalendarConnectionCreate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    if data.provider == "google":
        raise HTTPException(400, "Use the Google OAuth flow to add Google Calendar")
    if data.provider == "ical" and not data.ical_url:
        raise HTTPException(400, "iCal URL is required")

    conn = CalendarConnection(
        user_id=current_user.id,
        provider=data.provider,
        name=data.name,
        color=data.color,
        ical_url=data.ical_url,
    )
    db.add(conn)
    await db.flush()

    # Trigger initial sync
    try:
        await sync_connection(conn, db, current_user.timezone)
    except Exception:
        pass  # Don't fail creation if initial sync fails

    return CalendarConnectionResponse.model_validate(conn)


@router.put("/connections/{conn_id}")
async def update_connection(
    conn_id: str,
    data: CalendarConnectionUpdate,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CalendarConnection).where(
            CalendarConnection.id == conn_id,
            CalendarConnection.user_id == current_user.id,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(404, "Connection not found")

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(conn, key, value)
    await db.flush()

    # Re-sync if URL changed
    if "ical_url" in updates and conn.provider == "ical":
        try:
            await sync_connection(conn, db, current_user.timezone)
        except Exception:
            pass

    return CalendarConnectionResponse.model_validate(conn)


@router.delete("/connections/{conn_id}", status_code=204)
async def delete_connection(
    conn_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CalendarConnection).where(
            CalendarConnection.id == conn_id,
            CalendarConnection.user_id == current_user.id,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(404, "Connection not found")
    await db.delete(conn)
    return None


@router.post("/connections/{conn_id}/sync")
async def force_sync(
    conn_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CalendarConnection).where(
            CalendarConnection.id == conn_id,
            CalendarConnection.user_id == current_user.id,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(404, "Connection not found")

    try:
        await sync_connection(conn, db, current_user.timezone)
    except Exception as e:
        raise HTTPException(500, f"Sync failed: {str(e)}")

    return CalendarConnectionResponse.model_validate(conn)


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

@router.get("/google/auth-url")
async def google_auth_url(current_user: User = Depends(require_pin)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(501, "Google Calendar integration is not configured")
    url = get_google_auth_url(state=current_user.id)
    return {"url": url}


@router.get("/google/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 callback from Google. state = user_id."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(501, "Google Calendar not configured")

    try:
        tokens = await exchange_google_code(code)
    except Exception as e:
        # Redirect to frontend with error
        return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/parent/settings?calendar_error=auth_failed")

    access_token = tokens["access_token"]
    refresh_token = tokens.get("refresh_token", "")
    expires_in = tokens.get("expires_in", 3600)

    # Get email
    try:
        email = await get_google_email(access_token)
    except Exception:
        email = ""

    # Create connection
    conn = CalendarConnection(
        user_id=state,
        provider="google",
        name=f"Google ({email})" if email else "Google Calendar",
        google_access_token=encrypt_token(access_token),
        google_refresh_token=encrypt_token(refresh_token) if refresh_token else None,
        google_token_expiry=datetime.now(ZoneInfo("UTC")) + timedelta(seconds=expires_in),
        google_email=email,
    )
    db.add(conn)
    await db.flush()

    # Get user timezone for sync
    from models import User as UserModel
    result = await db.execute(select(UserModel).where(UserModel.id == state))
    user = result.scalar_one_or_none()
    tz = user.timezone if user else "UTC"

    # Initial sync
    try:
        await sync_connection(conn, db, tz)
    except Exception:
        pass

    await db.commit()
    return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/parent/settings?calendar_success=1")


# ---------------------------------------------------------------------------
# Shared helper: build combined calendar days for a date range
# ---------------------------------------------------------------------------

async def _build_calendar_days(
    start: date, end: date, current_user: User, db: AsyncSession,
    auto_sync: bool = True,
) -> tuple[list[dict], bool]:
    """Return (days_list, google_available) for a date range."""
    from sqlalchemy import func

    # Auto-sync stale connections (>15 min old)
    result = await db.execute(
        select(CalendarConnection).where(
            CalendarConnection.user_id == current_user.id,
            CalendarConnection.is_enabled == True,
        )
    )
    connections = result.scalars().all()
    if auto_sync:
        stale_threshold = datetime.now(ZoneInfo("UTC")) - timedelta(minutes=15)
        for conn in connections:
            if not conn.last_synced_at or conn.last_synced_at < stale_threshold:
                try:
                    await sync_connection(conn, db, current_user.timezone)
                except Exception:
                    pass

    # Fetch external events
    conn_ids = [c.id for c in connections if c.is_enabled]
    conn_map = {c.id: c for c in connections}
    external_events = []
    if conn_ids:
        result = await db.execute(
            select(CalendarEvent).where(
                CalendarEvent.connection_id.in_(conn_ids),
                CalendarEvent.start_date <= end,
                CalendarEvent.end_date >= start,
            ).order_by(CalendarEvent.start_date, CalendarEvent.start_time)
        )
        for ev in result.scalars().all():
            conn = conn_map.get(ev.connection_id)
            external_events.append({
                "event": ev,
                "color": conn.color if conn else "#3b82f6",
                "source": conn.name if conn else "",
            })

    # Fetch children + chore data
    result = await db.execute(
        select(Child).where(Child.user_id == current_user.id).order_by(Child.display_order)
    )
    children = result.scalars().all()

    chore_data = {}
    for child in children:
        result = await db.execute(
            select(Chore)
            .join(ChoreAssignment, Chore.id == ChoreAssignment.chore_id)
            .where(
                ChoreAssignment.child_id == child.id,
                Chore.frequency == "daily",
                Chore.is_active == True,
            )
        )
        chore_data[child.id] = {
            "name": child.name,
            "avatar_value": child.avatar_value,
            "chore_count": len(result.scalars().all()),
        }

    # Get completions in range
    completion_counts = {}
    for child in children:
        result = await db.execute(
            select(
                ChoreCompletion.period_date,
                func.count().label("cnt"),
            )
            .join(Chore, ChoreCompletion.chore_id == Chore.id)
            .where(
                ChoreCompletion.child_id == child.id,
                ChoreCompletion.period_date >= start,
                ChoreCompletion.period_date <= end,
                Chore.frequency == "daily",
            )
            .group_by(ChoreCompletion.period_date)
        )
        for row in result:
            completion_counts[(row.period_date, child.id)] = row.cnt

    # Fetch meal plan entries
    monday_of_start = start - timedelta(days=start.weekday())
    result = await db.execute(
        select(MealPlanEntry, Meal)
        .join(Meal, MealPlanEntry.meal_id == Meal.id)
        .where(
            MealPlanEntry.user_id == current_user.id,
            MealPlanEntry.week_start >= monday_of_start - timedelta(days=7),
            MealPlanEntry.week_start <= end,
        )
    )
    meal_entries = result.all()
    meals_by_date = {}
    for entry, meal in meal_entries:
        entry_date = entry.week_start + timedelta(days=entry.day_of_week)
        if start <= entry_date <= end:
            meals_by_date.setdefault(entry_date, []).append({
                "slot": entry.slot,
                "meal_name": meal.name,
            })

    # Build day-by-day
    days = []
    d = start
    while d <= end:
        day_events = []
        for ev_data in external_events:
            ev = ev_data["event"]
            if ev.start_date <= d and ev.end_date >= d:
                day_events.append(CalendarEventResponse(
                    id=ev.id,
                    title=ev.title,
                    description=ev.description,
                    start_date=ev.start_date,
                    start_time=ev.start_time.strftime("%H:%M") if ev.start_time else None,
                    end_date=ev.end_date,
                    end_time=ev.end_time.strftime("%H:%M") if ev.end_time else None,
                    is_all_day=ev.is_all_day,
                    location=ev.location,
                    color=ev_data["color"],
                    source=ev_data["source"],
                ))

        day_chores = []
        for child in children:
            cd = chore_data.get(child.id, {})
            total = cd.get("chore_count", 0)
            done = completion_counts.get((d, child.id), 0)
            if total > 0:
                day_chores.append({
                    "child_name": cd.get("name", ""),
                    "avatar_value": cd.get("avatar_value", ""),
                    "completed": done,
                    "total": total,
                })

        day_meals = meals_by_date.get(d, [])

        days.append(CalendarDayResponse(
            date=d,
            events=day_events,
            chores=day_chores,
            meals=day_meals,
        ).model_dump())
        d += timedelta(days=1)

    return days, bool(settings.GOOGLE_CLIENT_ID)


# ---------------------------------------------------------------------------
# Combined calendar endpoints
# ---------------------------------------------------------------------------

@router.get("/week")
async def calendar_week(
    week_start: date | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Combined calendar for a week (Mon-Sun). Defaults to current week."""
    if week_start:
        # Snap to Monday
        start = week_start - timedelta(days=week_start.weekday())
    else:
        tz = ZoneInfo(current_user.timezone)
        today = datetime.now(tz).date()
        start = today - timedelta(days=today.weekday())
    end = start + timedelta(days=6)

    days, google_available = await _build_calendar_days(start, end, current_user, db)
    return {
        "week_start": start.isoformat(),
        "week_end": end.isoformat(),
        "days": days,
        "google_available": google_available,
    }


@router.get("/month")
async def calendar_month(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Combined calendar: external events + chores + meals for a month."""
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)

    days, google_available = await _build_calendar_days(start, end, current_user, db)
    return {
        "year": year,
        "month": month,
        "days": days,
        "google_available": google_available,
    }
