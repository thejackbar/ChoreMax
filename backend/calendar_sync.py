"""Calendar sync helpers for Google Calendar and iCal feeds."""

from datetime import datetime, timedelta
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
GOOGLE_SCOPES = "https://www.googleapis.com/auth/calendar.readonly"


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


async def sync_google_connection(conn: CalendarConnection, db: AsyncSession, timezone: str = "UTC"):
    """Fetch events from Google Calendar and upsert into DB."""
    access_token = await _ensure_google_token(conn, db)
    tz = ZoneInfo(timezone)
    now = datetime.now(tz)
    time_min = (now - timedelta(days=30)).isoformat()
    time_max = (now + timedelta(days=90)).isoformat()

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
                f"{GOOGLE_CALENDAR_API}/calendars/primary/events",
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
            # All-day event
            start_date = start["date"]
            start_time = None
            end_date = end.get("date", start_date)
            end_time = None
            is_all_day = True
        else:
            # Timed event
            dt_str = start.get("dateTime", "")
            dt = datetime.fromisoformat(dt_str)
            start_date = dt.date().isoformat()
            start_time = dt.strftime("%H:%M:%S")
            edt_str = end.get("dateTime", dt_str)
            edt = datetime.fromisoformat(edt_str)
            end_date = edt.date().isoformat()
            end_time = edt.strftime("%H:%M:%S")
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


# ---------------------------------------------------------------------------
# iCal feed sync
# ---------------------------------------------------------------------------

async def sync_ical_connection(conn: CalendarConnection, db: AsyncSession, timezone: str = "UTC"):
    """Fetch and parse an iCal (.ics) feed, upsert events."""
    if not conn.ical_url:
        return

    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        resp = await client.get(conn.ical_url)
        resp.raise_for_status()
        ics_text = resp.text

    from icalendar import Calendar as iCalCalendar
    cal = iCalCalendar.from_ical(ics_text)

    tz = ZoneInfo(timezone)
    now = datetime.now(tz)
    window_start = (now - timedelta(days=30)).date()
    window_end = (now + timedelta(days=90)).date()

    events = []
    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        uid = str(component.get("uid", ""))
        if not uid:
            continue

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
            s_time = dtstart_val.strftime("%H:%M:%S")
            e_date = dtend_val.date() if hasattr(dtend_val, "hour") else dtend_val
            e_time = dtend_val.strftime("%H:%M:%S") if hasattr(dtend_val, "hour") else None
            is_all_day = False
        else:
            # It's a date (all-day)
            s_date = dtstart_val
            s_time = None
            e_date = dtend_val
            e_time = None
            is_all_day = True

        # Filter to sync window
        if s_date > window_end or e_date < window_start:
            continue

        events.append({
            "uid": uid,
            "title": str(component.get("summary", "(No title)")),
            "description": str(component.get("description", "")) or None,
            "start_date": s_date.isoformat(),
            "start_time": s_time,
            "end_date": e_date.isoformat(),
            "end_time": e_time,
            "is_all_day": is_all_day,
            "location": str(component.get("location", "")) or None,
        })

    # Delete events outside window, upsert new ones
    await _upsert_ical_events(conn.id, events, db)
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
