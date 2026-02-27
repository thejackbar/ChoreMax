from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo


def get_period_date(frequency: str, timezone: str = "Australia/Sydney", for_date: date | None = None) -> date:
    """Get the canonical period_date for a chore frequency in the user's timezone."""
    if for_date:
        d = for_date
    else:
        tz = ZoneInfo(timezone)
        d = datetime.now(tz).date()

    if frequency == "daily":
        return d
    elif frequency == "weekly":
        # Monday of the current week
        return d - timedelta(days=d.weekday())
    raise ValueError(f"Unknown frequency: {frequency}")
