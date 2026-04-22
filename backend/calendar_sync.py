"""Calendar sync helpers for Google Calendar and iCal feeds."""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from config import settings
from models import CalendarConnection, CalendarEvent

# ---------------------------------------------------------------------------
# Token encryption (Fernet)
# ---------------------------------------------------------------------------

_fernet = None


def _get_fernet():
    global _fernet
    if _fernet is None:
        if not settings.CALENDAR_ENCRYPTION_KEY:
            raise RuntimeError("CALENDAR_ENCRYPTION_KEY not configured")
        from cryptography.fernet import Fernet
        _fernet = Fernet(settings.CALENDAR_ENCRYPTION_KEY.encode())
    return _fernet


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()


# ---------------------------------------------------------------------------
# Google Calendar sync
# ---------------------------------------------------------------------------

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar"


def get_google_auth_url(state: str = "") -> str:
    """Build Google OAuth2 authorization URL."""
    from urllib.parse import urlencode
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
    }
    if state:
        params["state"] = state
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


async def exchange_google_code(code: str) -> dict:
    """Exchange authorization code for tokens."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        resp.raise_for_status()
        return resp.json()


async def refresh_google_token(refresh_token: str) -> dict:
    """Refresh an expired access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "refresh_token": refresh_token,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "grant_type": "refresh_token",
        })
        resp.raise_for_status()
        return resp.json()


async def get_google_email(access_token: str) -> str:
    """Get the Google account email."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json().get("email", "")


async def list_google_calendars(access_token: str) -> list[dict]:
    """List all calendars for the authenticated Google user."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GOOGLE_CALENDAR_API}/users/me/calendarList",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        data = resp.json()
        calendars = []
        for item in data.get("items", []):
            calendars.append({
                "id": item["id"],
                "summary": item.get("summary", item["id"]),
                "description": item.get("description", ""),
                "primary": item.get("primary", False),
                "background_color": item.get("backgroundColor", "#3b82f6"),
                "selected": item.get("selected", True),
            })
        return calendars


async def _ensure_google_token(conn: CalendarConnection, db: AsyncSession) -> str:
    """Return a valid access token, refreshing if needed."""
    if conn.google_token_expiry and conn.google_token_expiry > datetime.now(ZoneInfo("UTC")):
        return decrypt_token(conn.google_access_token)

    # Refresh
    refresh = decrypt_token(conn.google_refresh_token)
    data = await refresh_google_token(refresh)
    access = data["access_token"]
    conn.google_access_token = encrypt_token(access)
    conn.google_token_expiry = datetime.now(ZoneInfo("UTC")) + timedelta(seconds=data.get("expires_in", 3600))
    if "refresh_token" in data:
        conn.google_refresh_token = encrypt_token(data["refresh_token"])
    await db.flush()
    return access


async def get_valid_google_token(conn: CalendarConnection, db: AsyncSession) -> str:
    """Public wrapper to get a valid access token for a connection."""
    return await _ensure_google_token(conn, db)


async def sync_google_connection(conn: CalendarConnection, db: AsyncSession, timezone: str = "UTC"):
    """Fetch events from Google Calendar and upsert into DB."""
    from urllib.parse import quote
    access_token = await _ensure_google_token(conn, db)
    tz = ZoneInfo(timezone)
    now = datetime.now(tz)
    time_min = (now - timedelta(days=30)).isoformat()
    time_max = (now + timedelta(days=90)).isoformat()
    cal_id = quote(conn.google_calendar_id or "primary", safe="")

    events = []
    page_token = None

    async with httpx.AsyncClient() as client:
        while True:
            params = {
                "timeMin": time_min,
                "timeMax": time_max,
                "singleEvents": "true",
                "orderBy": "startTime",
                "maxResults": "250",
            }
            if page_token:
                params["pageToken"] = page_token

            resp = await client.get(
                f"{GOOGLE_CALENDAR_API}/calendars/{cal_id}/events",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()
            events.extend(data.get("items", []))
            page_token = data.get("nextPageToken")
            if not page_token:
                break

    # Delete old events for this connection in the sync window, then upsert
    await _upsert_google_events(conn.id, events, db)
    conn.last_synced_at = datetime.now(ZoneInfo("UTC"))
    await db.flush()


async def _upsert_google_events(connection_id: str, items: list[dict], db: AsyncSession):
    """Upsert Google Calendar events."""
    if not items:
        return

    seen_ids = set()
    for item in items:
        eid = item.get("id", "")
        if not eid or eid in seen_ids:
            continue
        seen_ids.add(eid)

        start = item.get("start", {})
        end = item.get("end", {})

        if "date" in start:
            # All-day event — Google uses exclusive end date, so subtract 1 day
            start_date = date.fromisoformat(start["date"])
            start_time = None
            raw_end = date.fromisoformat(end.get("date", start["date"]))
            end_date = raw_end - timedelta(days=1) if raw_end > start_date else start_date
            end_time = None
            is_all_day = True
        else:
            # Timed event
            dt_str = start.get("dateTime", "")
            dt = datetime.fromisoformat(dt_str)
            start_date = dt.date()
            start_time = dt.time().replace(tzinfo=None)
            edt_str = end.get("dateTime", dt_str)
            edt = datetime.fromisoformat(edt_str)
            end_date = edt.date()
            end_time = edt.time().replace(tzinfo=None)
            is_all_day = False

        stmt = pg_insert(CalendarEvent).values(
            connection_id=connection_id,
            external_id=eid,
            title=item.get("summary", "(No title)"),
            description=item.get("description"),
            start_date=start_date,
            start_time=start_time,
            end_date=end_date,
            end_time=end_time,
            is_all_day=is_all_day,
            location=item.get("location"),
        ).on_conflict_do_update(
            index_elements=["connection_id", "external_id"],
            set_={
                "title": item.get("summary", "(No title)"),
                "description": item.get("description"),
                "start_date": start_date,
                "start_time": start_time,
                "end_date": end_date,
                "end_time": end_time,
                "is_all_day": is_all_day,
                "location": item.get("location"),
            },
        )
        await db.execute(stmt)


async def create_google_event(
    conn: CalendarConnection, db: AsyncSession,
    title: str, start_date: date, end_date: date | None = None,
    start_time: time | None = None, end_time: time | None = None,
    is_all_day: bool = True, description: str | None = None,
    location: str | None = None, timezone: str = "UTC",
) -> CalendarEvent:
    """Create an event on Google Calendar and store locally."""
    from urllib.parse import quote
    access_token = await _ensure_google_token(conn, db)
    cal_id = quote(conn.google_calendar_id or "primary", safe="")

    body: dict = {"summary": title}
    if description:
        body["description"] = description
    if location:
        body["location"] = location

    if is_all_day:
        body["start"] = {"date": start_date.isoformat()}
        # Google uses exclusive end date for all-day events
        actual_end = (end_date or start_date) + timedelta(days=1)
        body["end"] = {"date": actual_end.isoformat()}
    else:
        tz = timezone
        body["start"] = {"dateTime": f"{start_date}T{start_time or '09:00:00'}", "timeZone": tz}
        body["end"] = {"dateTime": f"{end_date or start_date}T{end_time or '10:00:00'}", "timeZone": tz}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GOOGLE_CALENDAR_API}/calendars/{cal_id}/events",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json=body,
        )
        resp.raise_for_status()
        data = resp.json()

    # Store locally
    ev = CalendarEvent(
        connection_id=conn.id,
        external_id=data["id"],
        title=title,
        description=description,
        start_date=start_date,
        start_time=start_time,
        end_date=end_date or start_date,
        end_time=end_time,
        is_all_day=is_all_day,
        location=location,
    )
    db.add(ev)
    await db.flush()
    return ev


async def delete_google_event(conn: CalendarConnection, event: CalendarEvent, db: AsyncSession):
    """Delete an event from Google Calendar and remove locally."""
    from urllib.parse import quote
    access_token = await _ensure_google_token(conn, db)
    cal_id = quote(conn.google_calendar_id or "primary", safe="")

    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{GOOGLE_CALENDAR_API}/calendars/{cal_id}/events/{event.external_id}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        # 410 Gone means already deleted, which is fine
        if resp.status_code not in (200, 204, 410):
            resp.raise_for_status()

    await db.delete(event)
    await db.flush()


async def update_google_event(
    conn: CalendarConnection, event: CalendarEvent, db: AsyncSession,
    title: str | None = None, start_date: date | None = None,
    end_date: date | None = None, start_time: time | None = ...,
    end_time: time | None = ..., is_all_day: bool | None = None,
    description: str | None = ..., location: str | None = ...,
    timezone: str = "UTC",
) -> CalendarEvent:
    """Update an event on Google Calendar and locally."""
    from urllib.parse import quote
    access_token = await _ensure_google_token(conn, db)
    cal_id = quote(conn.google_calendar_id or "primary", safe="")

    # Build patch body from provided fields
    body: dict = {}
    if title is not None:
        body["summary"] = title
        event.title = title
    if description is not ...:
        body["description"] = description or ""
        event.description = description
    if location is not ...:
        body["location"] = location or ""
        event.location = location

    use_all_day = is_all_day if is_all_day is not None else event.is_all_day
    s_date = start_date or event.start_date
    e_date = end_date or event.end_date or s_date

    if is_all_day is not None or start_date is not None or end_date is not None or start_time is not ... or end_time is not ...:
        if use_all_day:
            body["start"] = {"date": s_date.isoformat()}
            body["end"] = {"date": (e_date + timedelta(days=1)).isoformat()}
            event.start_date = s_date
            event.end_date = e_date
            event.start_time = None
            event.end_time = None
            event.is_all_day = True
        else:
            s_time = start_time if start_time is not ... else event.start_time
            e_time = end_time if end_time is not ... else event.end_time
            body["start"] = {"dateTime": f"{s_date}T{s_time or '09:00:00'}", "timeZone": timezone}
            body["end"] = {"dateTime": f"{e_date}T{e_time or '10:00:00'}", "timeZone": timezone}
            event.start_date = s_date
            event.end_date = e_date
            event.start_time = s_time
            event.end_time = e_time
            event.is_all_day = False

    if body:
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{GOOGLE_CALENDAR_API}/calendars/{cal_id}/events/{event.external_id}",
                headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                json=body,
            )
            resp.raise_for_status()

    await db.flush()
    return event


# ---------------------------------------------------------------------------
# iCal feed sync
# ---------------------------------------------------------------------------

async def sync_ical_connection(conn: CalendarConnection, db: AsyncSession, timezone: str = "UTC"):
    """Fetch and parse an iCal (.ics) feed, upsert events."""
    if not conn.ical_url:
        return

    # Convert webcal:// to https:// for fetching
    fetch_url = conn.ical_url
    if fetch_url.startswith("webcal://"):
        fetch_url = "https://" + fetch_url[len("webcal://"):]

    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        resp = await client.get(fetch_url)
        resp.raise_for_status()
        ics_text = resp.text

    from icalendar import Calendar as iCalCalendar
    cal = iCalCalendar.from_ical(ics_text)

    tz = ZoneInfo(timezone)
    now = datetime.now(tz)
    window_start = (now - timedelta(days=30)).date()
    window_end = (now + timedelta(days=90)).date()

    # Dedupe by external_id. iCal feeds routinely contain multiple VEVENTs
    # sharing the same UID — a master recurring event plus RECURRENCE-ID
    # overrides (e.g. "cancelled this week"). Without RECURRENCE-ID in the
    # key, the bulk insert would violate (connection_id, external_id) unique.
    events_by_id: dict[str, dict] = {}
    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        try:
            uid = str(component.get("uid", ""))
            if not uid:
                continue

            recurrence_id = component.get("recurrence-id")
            if recurrence_id is not None:
                rid_val = recurrence_id.dt
                rid_str = rid_val.isoformat() if hasattr(rid_val, "isoformat") else str(rid_val)
                external_id = f"{uid}::{rid_str}"
            else:
                external_id = uid

            dtstart = component.get("dtstart")
            dtend = component.get("dtend")
            if not dtstart:
                continue

            dtstart_val = dtstart.dt
            dtend_val = dtend.dt if dtend else dtstart_val

            # Handle date vs datetime
            if hasattr(dtstart_val, "hour"):
                # It's a datetime
                if dtstart_val.tzinfo:
                    dtstart_val = dtstart_val.astimezone(tz)
                    if hasattr(dtend_val, "hour") and dtend_val.tzinfo:
                        dtend_val = dtend_val.astimezone(tz)
                s_date = dtstart_val.date()
                s_time = dtstart_val.time().replace(tzinfo=None)
                e_date = dtend_val.date() if hasattr(dtend_val, "hour") else dtend_val
                e_time = dtend_val.time().replace(tzinfo=None) if hasattr(dtend_val, "hour") else None
                is_all_day = False
            else:
                # It's a date (all-day) — iCal uses exclusive end date
                s_date = dtstart_val
                s_time = None
                e_date = dtend_val - timedelta(days=1) if dtend_val > dtstart_val else dtstart_val
                e_time = None
                is_all_day = True

            # Normalize to date objects for comparison
            if hasattr(s_date, 'date'):
                s_date = s_date.date()
            if hasattr(e_date, 'date'):
                e_date = e_date.date()

            # Filter to sync window
            if s_date > window_end or e_date < window_start:
                continue

            events_by_id[external_id] = {
                "uid": external_id,
                "title": str(component.get("summary", "(No title)")),
                "description": str(component.get("description", "")) or None,
                "start_date": s_date,
                "start_time": s_time,
                "end_date": e_date,
                "end_time": e_time,
                "is_all_day": is_all_day,
                "location": str(component.get("location", "")) or None,
            }
        except Exception:
            continue  # Skip unparseable events

    # Delete events outside window, upsert new ones
    await _upsert_ical_events(conn.id, list(events_by_id.values()), db)
    conn.last_synced_at = datetime.now(ZoneInfo("UTC"))
    await db.flush()


async def _upsert_ical_events(connection_id: str, events: list[dict], db: AsyncSession):
    """Upsert iCal events."""
    # Remove all existing events for this connection, then insert fresh
    # (simpler than individual upserts for iCal which may reuse UIDs differently)
    await db.execute(
        delete(CalendarEvent).where(CalendarEvent.connection_id == connection_id)
    )

    for ev in events:
        event = CalendarEvent(
            connection_id=connection_id,
            external_id=ev["uid"],
            title=ev["title"],
            description=ev["description"],
            start_date=ev["start_date"],
            start_time=ev["start_time"],
            end_date=ev["end_date"],
            end_time=ev["end_time"],
            is_all_day=ev["is_all_day"],
            location=ev["location"],
        )
        db.add(event)


async def sync_connection(conn: CalendarConnection, db: AsyncSession, timezone: str = "UTC"):
    """Dispatch sync based on provider."""
    if conn.provider == "google":
        await sync_google_connection(conn, db, timezone)
    elif conn.provider == "ical":
        await sync_ical_connection(conn, db, timezone)
