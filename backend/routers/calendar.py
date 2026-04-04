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
    create_google_event, decrypt_token, delete_google_event, encrypt_token,
    exchange_google_code, get_google_auth_url, get_google_email,
    get_valid_google_token, list_google_calendars, sync_connection,
    update_google_event,
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
    sync_error = None
    try:
        await sync_connection(conn, db, current_user.timezone)
    except Exception as e:
        sync_error = str(e)

    resp = CalendarConnectionResponse.model_validate(conn)
    result = resp.model_dump()
    if sync_error:
        result["sync_warning"] = f"Feed added but initial sync failed: {sync_error}"
    return result


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
    error: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 callback from Google. state = user_id."""
    if error:
        return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/parent/calendar?calendar_error={error}")
    if not settings.GOOGLE_CLIENT_ID:
        return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/parent/calendar?calendar_error=not_configured")

    try:
        tokens = await exchange_google_code(code)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/parent/calendar?calendar_error=auth_failed")

    access_token = tokens["access_token"]
    refresh_token = tokens.get("refresh_token", "")
    expires_in = tokens.get("expires_in", 3600)

    try:
        email = await get_google_email(access_token)
    except Exception:
        email = ""

    try:
        # Create a pending connection (is_enabled=False, no calendar_id yet)
        conn = CalendarConnection(
            user_id=state,
            provider="google",
            name=f"Google ({email})" if email else "Google Calendar",
            is_enabled=False,
            google_access_token=encrypt_token(access_token),
            google_refresh_token=encrypt_token(refresh_token) if refresh_token else None,
            google_token_expiry=datetime.now(ZoneInfo("UTC")) + timedelta(seconds=expires_in),
            google_email=email,
            google_calendar_id=None,
        )
        db.add(conn)
        await db.commit()
    except Exception as e:
        import traceback
        traceback.print_exc()
        return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/parent/calendar?calendar_error=save_failed")

    return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/parent/calendar?google_pending={conn.id}")


@router.get("/google/{conn_id}/calendars")
async def list_google_calendars_endpoint(
    conn_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List available Google calendars for a pending connection."""
    result = await db.execute(
        select(CalendarConnection).where(
            CalendarConnection.id == conn_id,
            CalendarConnection.user_id == current_user.id,
            CalendarConnection.provider == "google",
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(404, "Connection not found")

    try:
        access_token = await get_valid_google_token(conn, db)
        calendars = await list_google_calendars(access_token)
        return {"calendars": calendars}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Failed to list calendars: {str(e)}")


@router.post("/google/{conn_id}/select-calendars")
async def select_google_calendars(
    conn_id: str,
    data: dict,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    """Select which Google calendars to sync. Creates one connection per calendar."""
    result = await db.execute(
        select(CalendarConnection).where(
            CalendarConnection.id == conn_id,
            CalendarConnection.user_id == current_user.id,
            CalendarConnection.provider == "google",
        )
    )
    pending = result.scalar_one_or_none()
    if not pending:
        raise HTTPException(404, "Connection not found")

    selected = data.get("calendars", [])  # list of {id, name, color}
    if not selected:
        raise HTTPException(400, "Select at least one calendar")

    created_conns = []
    for cal in selected:
        conn = CalendarConnection(
            user_id=current_user.id,
            provider="google",
            name=cal.get("name", "Google Calendar"),
            color=cal.get("color", "#3b82f6"),
            google_access_token=pending.google_access_token,
            google_refresh_token=pending.google_refresh_token,
            google_token_expiry=pending.google_token_expiry,
            google_email=pending.google_email,
            google_calendar_id=cal["id"],
            is_enabled=True,
        )
        db.add(conn)
        await db.flush()

        # Sync each calendar
        try:
            await sync_connection(conn, db, current_user.timezone)
        except Exception:
            pass

        created_conns.append(CalendarConnectionResponse.model_validate(conn))

    # Delete the pending connection
    await db.delete(pending)

    return [c.model_dump() for c in created_conns]


# ---------------------------------------------------------------------------
# Event CRUD (create on Google, delete from Google)
# ---------------------------------------------------------------------------

@router.post("/events", status_code=201)
async def create_event(
    data: dict,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    """Create a calendar event. If connection_id points to a Google connection, creates on Google too."""
    conn_id = data.get("connection_id")
    if not conn_id:
        raise HTTPException(400, "connection_id is required")

    result = await db.execute(
        select(CalendarConnection).where(
            CalendarConnection.id == conn_id,
            CalendarConnection.user_id == current_user.id,
        )
    )
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(404, "Connection not found")
    if conn.provider != "google":
        raise HTTPException(400, "Can only create events on Google calendars")

    title = data.get("title", "").strip()
    if not title:
        raise HTTPException(400, "Title is required")

    start_date_str = data.get("start_date")
    if not start_date_str:
        raise HTTPException(400, "start_date is required")

    from datetime import time as dt_time
    start_date_val = date.fromisoformat(start_date_str)
    end_date_val = date.fromisoformat(data["end_date"]) if data.get("end_date") else None
    is_all_day = data.get("is_all_day", True)

    start_time_val = None
    end_time_val = None
    if not is_all_day:
        if data.get("start_time"):
            parts = data["start_time"].split(":")
            start_time_val = dt_time(int(parts[0]), int(parts[1]))
        if data.get("end_time"):
            parts = data["end_time"].split(":")
            end_time_val = dt_time(int(parts[0]), int(parts[1]))

    # assigned_children is ChoreMax-specific, not synced to Google
    assigned_children = data.get("assigned_children")  # list of child IDs or None

    try:
        ev = await create_google_event(
            conn, db,
            title=title,
            start_date=start_date_val,
            end_date=end_date_val,
            start_time=start_time_val,
            end_time=end_time_val,
            is_all_day=is_all_day,
            description=data.get("description"),
            location=data.get("location"),
            timezone=current_user.timezone,
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to create event: {str(e)}")

    # Save assignment locally
    if assigned_children is not None:
        ev.assigned_children = assigned_children
        await db.flush()

    return {
        "id": ev.id,
        "title": ev.title,
        "start_date": ev.start_date.isoformat(),
        "end_date": ev.end_date.isoformat() if ev.end_date else None,
        "is_all_day": ev.is_all_day,
        "assigned_children": ev.assigned_children or [],
    }


@router.put("/events/{event_id}")
async def update_event(
    event_id: str,
    data: dict,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    """Update a calendar event. If it's on Google, updates Google too."""
    result = await db.execute(
        select(CalendarEvent)
        .join(CalendarConnection, CalendarEvent.connection_id == CalendarConnection.id)
        .where(
            CalendarEvent.id == event_id,
            CalendarConnection.user_id == current_user.id,
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")

    result = await db.execute(
        select(CalendarConnection).where(CalendarConnection.id == event.connection_id)
    )
    conn = result.scalar_one_or_none()

    # Handle assigned_children separately (ChoreMax-only, not synced)
    assigned_children = data.pop("assigned_children", None)

    if conn and conn.provider == "google":
        from datetime import time as dt_time
        kwargs = {}
        if "title" in data:
            kwargs["title"] = data["title"]
        if "description" in data:
            kwargs["description"] = data["description"] or None
        if "location" in data:
            kwargs["location"] = data["location"] or None
        if "is_all_day" in data:
            kwargs["is_all_day"] = data["is_all_day"]
        if "start_date" in data:
            kwargs["start_date"] = date.fromisoformat(data["start_date"])
        if "end_date" in data:
            kwargs["end_date"] = date.fromisoformat(data["end_date"]) if data["end_date"] else None
        if "start_time" in data and data["start_time"]:
            p = data["start_time"].split(":")
            kwargs["start_time"] = dt_time(int(p[0]), int(p[1]))
        elif "start_time" in data:
            kwargs["start_time"] = None
        if "end_time" in data and data["end_time"]:
            p = data["end_time"].split(":")
            kwargs["end_time"] = dt_time(int(p[0]), int(p[1]))
        elif "end_time" in data:
            kwargs["end_time"] = None

        try:
            event = await update_google_event(
                conn, event, db, timezone=current_user.timezone, **kwargs,
            )
        except Exception as e:
            raise HTTPException(500, f"Failed to update event: {str(e)}")
    elif conn and conn.provider == "ical":
        # iCal events can only have assignments updated, not the event itself
        pass
    else:
        raise HTTPException(400, "Cannot edit this event type")

    # Save assignment locally regardless of provider
    if assigned_children is not None:
        event.assigned_children = assigned_children if assigned_children else None
        await db.flush()

    return {
        "id": event.id,
        "title": event.title,
        "start_date": event.start_date.isoformat(),
        "end_date": event.end_date.isoformat() if event.end_date else None,
        "is_all_day": event.is_all_day,
        "assigned_children": event.assigned_children or [],
    }


@router.delete("/events/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a calendar event. If it's on Google, deletes from Google too."""
    result = await db.execute(
        select(CalendarEvent)
        .join(CalendarConnection, CalendarEvent.connection_id == CalendarConnection.id)
        .where(
            CalendarEvent.id == event_id,
            CalendarConnection.user_id == current_user.id,
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")

    # Get the connection to check provider
    result = await db.execute(
        select(CalendarConnection).where(CalendarConnection.id == event.connection_id)
    )
    conn = result.scalar_one_or_none()

    if conn and conn.provider == "google":
        try:
            await delete_google_event(conn, event, db)
        except Exception as e:
            raise HTTPException(500, f"Failed to delete from Google: {str(e)}")
    else:
        await db.delete(event)

    return None


# ---------------------------------------------------------------------------
# Event assignment (ChoreMax-specific, works on any provider)
# ---------------------------------------------------------------------------

@router.put("/events/{event_id}/assign")
async def assign_event(
    event_id: str,
    data: dict,
    current_user: User = Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    """Assign/unassign children to a calendar event. Works on any provider."""
    result = await db.execute(
        select(CalendarEvent)
        .join(CalendarConnection, CalendarEvent.connection_id == CalendarConnection.id)
        .where(
            CalendarEvent.id == event_id,
            CalendarConnection.user_id == current_user.id,
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(404, "Event not found")

    assigned = data.get("assigned_children", [])
    event.assigned_children = assigned if assigned else None
    await db.flush()

    return {
        "id": event.id,
        "assigned_children": event.assigned_children or [],
    }


# ---------------------------------------------------------------------------
# Shared helper: build combined calendar days for a date range
# ---------------------------------------------------------------------------

async def _build_calendar_days(
    start: date, end: date, current_user: User, db: AsyncSession,
    auto_sync: bool = True, detailed_chores: bool = False,
) -> tuple[list[dict], bool]:
    """Return (days_list, google_available) for a date range.

    If detailed_chores=True, each day's chores include full per-child chore
    lists with individual completion status (for the week view).
    """
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
                "connection_id": ev.connection_id,
                "provider": conn.provider if conn else "",
                "color": conn.color if conn else "#3b82f6",
                "source": conn.name if conn else "",
                "assigned_children": ev.assigned_children or [],
            })

    # Fetch children
    result = await db.execute(
        select(Child).where(Child.user_id == current_user.id).order_by(Child.display_order)
    )
    children = result.scalars().all()

    # Fetch chore assignments per child
    child_chores: dict[str, list] = {}  # child_id -> list of Chore objects
    for child in children:
        result = await db.execute(
            select(Chore)
            .join(ChoreAssignment, Chore.id == ChoreAssignment.chore_id)
            .where(
                ChoreAssignment.child_id == child.id,
                Chore.frequency == "daily",
                Chore.is_active == True,
            )
            .order_by(Chore.time_of_day, Chore.title)
        )
        child_chores[child.id] = result.scalars().all()

    # Get completions in range (detailed or counts)
    if detailed_chores:
        # Fetch individual completions for the week view
        all_chore_ids = set()
        for chores in child_chores.values():
            for chore in chores:
                all_chore_ids.add(chore.id)

        # completions_map: (period_date, child_id, chore_id) -> completion
        completions_detail: dict[tuple, object] = {}
        if all_chore_ids:
            for child in children:
                result = await db.execute(
                    select(ChoreCompletion).where(
                        ChoreCompletion.child_id == child.id,
                        ChoreCompletion.period_date >= start,
                        ChoreCompletion.period_date <= end,
                        ChoreCompletion.chore_id.in_(all_chore_ids),
                    )
                )
                for comp in result.scalars().all():
                    completions_detail[(comp.period_date, comp.child_id, comp.chore_id)] = comp

                # Also check standalone completions from other children
                standalone_ids = [c.id for c in child_chores.get(child.id, []) if c.assignment_type == "standalone"]
                if standalone_ids:
                    result = await db.execute(
                        select(ChoreCompletion).where(
                            ChoreCompletion.period_date >= start,
                            ChoreCompletion.period_date <= end,
                            ChoreCompletion.chore_id.in_(standalone_ids),
                        )
                    )
                    for comp in result.scalars().all():
                        key = (comp.period_date, child.id, comp.chore_id)
                        if key not in completions_detail:
                            completions_detail[key] = comp
    else:
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

    # Build child lookup for assignments
    child_lookup = {c.id: {"id": c.id, "name": c.name, "avatar_value": c.avatar_value} for c in children}

    # Build day-by-day
    days = []
    d = start
    while d <= end:
        day_events = []

        for ev_data in external_events:
            ev = ev_data["event"]
            if ev.start_date <= d and ev.end_date >= d:
                assigned_ids = ev_data.get("assigned_children", [])
                assigned_names = [child_lookup[cid] for cid in assigned_ids if cid in child_lookup]
                day_events.append(CalendarEventResponse(
                    id=ev.id,
                    connection_id=ev_data.get("connection_id"),
                    provider=ev_data.get("provider", ""),
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
                    assigned_children=assigned_ids,
                    assigned_children_names=assigned_names,
                ))

        day_chores = []
        if detailed_chores:
            # Full chore list per child with completion status
            for child in children:
                chores = child_chores.get(child.id, [])
                if not chores:
                    continue
                chore_list = []
                completed_count = 0
                for chore in chores:
                    comp = completions_detail.get((d, child.id, chore.id))
                    is_done = comp is not None
                    if is_done:
                        completed_count += 1
                    chore_list.append({
                        "id": chore.id,
                        "title": chore.title,
                        "emoji": chore.emoji,
                        "value": chore.value,
                        "time_of_day": chore.time_of_day,
                        "assignment_type": chore.assignment_type,
                        "completed": is_done,
                        "completion_id": comp.id if comp else None,
                    })
                day_chores.append({
                    "child_id": child.id,
                    "child_name": child.name,
                    "avatar_value": child.avatar_value,
                    "token_icon": child.token_icon,
                    "color": child.color,
                    "chores": chore_list,
                    "completed": completed_count,
                    "total": len(chores),
                })
        else:
            for child in children:
                chores = child_chores.get(child.id, [])
                total = len(chores)
                done = completion_counts.get((d, child.id), 0)
                if total > 0:
                    day_chores.append({
                        "child_name": child.name,
                        "avatar_value": child.avatar_value,
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

    days, google_available = await _build_calendar_days(
        start, end, current_user, db, detailed_chores=True,
    )

    # Include Google connections for "add event" feature
    result = await db.execute(
        select(CalendarConnection).where(
            CalendarConnection.user_id == current_user.id,
            CalendarConnection.provider == "google",
            CalendarConnection.is_enabled == True,
            CalendarConnection.google_calendar_id.isnot(None),
        )
    )
    google_conns = [
        {"id": c.id, "name": c.name, "color": c.color}
        for c in result.scalars().all()
    ]

    # Fetch all children for assignment UI
    result = await db.execute(
        select(Child).where(Child.user_id == current_user.id).order_by(Child.display_order)
    )
    all_children = [
        {"id": c.id, "name": c.name, "avatar_value": c.avatar_value}
        for c in result.scalars().all()
    ]

    return {
        "week_start": start.isoformat(),
        "week_end": end.isoformat(),
        "days": days,
        "google_available": google_available,
        "google_connections": google_conns,
        "children": all_children,
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
