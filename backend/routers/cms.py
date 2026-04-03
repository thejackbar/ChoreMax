"""CMS endpoints - public read, PIN-protected write."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import require_user, require_pin
from database import get_db
from models import SiteContent

router = APIRouter(prefix="/api/cms", tags=["cms"])

# Default content seeded on first access if DB is empty
DEFAULT_CONTENT = {
    "hero": {
        "eyebrow": "The family organiser that kids actually enjoy",
        "title_line1": "Chores done.",
        "title_line2": "Family thriving.",
        "subtitle": "ChoreMax turns daily responsibilities into rewarding habits. Kids earn, save, and learn \u2014 while parents get a calmer, more organised home.",
        "cta_primary": "Join the Waitlist",
        "cta_secondary": "See how it works",
    },
    "proof": [
        {"value": "6", "label": "Built-in features"},
        {"value": "5", "label": "Beautiful themes"},
        {"value": "0", "label": "Child logins needed"},
        {"value": "\u221e", "label": "Family peace"},
    ],
    "features": {
        "title": "Everything your family needs",
        "subtitle": "One app to manage chores, savings, meals, and schedules \u2014 beautifully.",
        "items": [
            {"icon": "\u2705", "title": "Daily & Weekly Chores", "desc": "Kids tap their avatar to see what needs doing. Simple checkboxes make completing chores satisfying and fun."},
            {"icon": "\ud83d\udc37", "title": "Piggy Bank & Savings", "desc": "Every chore earns virtual money toward goals they choose. Watch their eyes light up as savings grow."},
            {"icon": "\ud83d\udcc5", "title": "Family Calendar", "desc": "Google Calendar and iCal sync keeps everyone on the same page. Add, edit, and manage events in one place."},
            {"icon": "\ud83c\udf7d\ufe0f", "title": "Meal Planning", "desc": "Drag-and-drop weekly meal planner with automatic shopping lists scaled to your family size."},
            {"icon": "\ud83c\udfa8", "title": "Beautiful Themes", "desc": "Choose from Warm, Ocean, Forest, Sunset, or Midnight themes. Every child gets their own colour too."},
            {"icon": "\ud83d\udd12", "title": "Parent PIN Protection", "desc": "Kids browse freely while settings, finances, and management stay behind your secure PIN."},
        ],
    },
    "mid_cta": {
        "title": "Ready to transform your family\u2019s routine?",
        "subtitle": "Join hundreds of families waiting for ChoreMax. Be first in line when we launch.",
        "button": "Get Early Access",
    },
    "steps": {
        "title": "Up and running in minutes",
        "subtitle": "No complicated setup. No child accounts. No friction.",
        "items": [
            {"num": "1", "title": "Set up your family", "desc": "Add your children, pick their avatars, and configure chores in minutes."},
            {"num": "2", "title": "Kids tap & complete", "desc": "Children tap their avatar on the home screen \u2014 no login needed. They see their chores and check them off."},
            {"num": "3", "title": "Watch them thrive", "desc": "Track progress, celebrate streaks, and watch savings grow toward goals they care about."},
        ],
    },
    "testimonials": {
        "title": "Families love ChoreMax",
        "items": [
            {"quote": "My kids actually fight over who gets to do chores first now. Never thought I'd see the day.", "name": "Sarah M.", "role": "Mum of 3"},
            {"quote": "The meal planner alone saves us hours every week. The chore tracking is the cherry on top.", "name": "James & Priya K.", "role": "Parents of 2"},
            {"quote": "No more \u201cI forgot\u201d excuses. The kids can see exactly what they need to do and what they'll earn.", "name": "Michelle T.", "role": "Mum of 4"},
        ],
    },
    "waitlist": {
        "title": "Join the Waitlist",
        "subtitle": "Be the first to know when ChoreMax launches. Early members get exclusive pricing.",
        "success_icon": "\ud83c\udf89",
        "success_title": "You\u2019re on the list!",
        "success_message": "We\u2019ll be in touch as soon as ChoreMax is ready. Thanks for your interest!",
        "button": "Join the Waitlist",
        "fine_print": "No spam, ever. Unsubscribe anytime.",
        "feature_options": [
            "Chore tracking & completion",
            "Piggy bank & savings goals",
            "Family calendar",
            "Meal planning & shopping lists",
            "Multiple themes",
            "All of the above!",
        ],
    },
    "hero_cards": [
        {"type": "child", "avatar": "\ud83e\uddd2", "name": "Liam", "stat": "4/5 chores done", "percent": 80},
        {"type": "child", "avatar": "\ud83d\udc67", "name": "Emma", "stat": "5/5 chores done", "percent": 100},
        {"type": "piggy", "avatar": "\ud83d\udc37", "name": "Emma\u2019s Savings", "stat": "$24.50 / $50.00", "percent": 49},
    ],
}


async def _ensure_defaults(db: AsyncSession):
    """Seed default content if site_content table is empty."""
    result = await db.execute(select(SiteContent.key))
    existing = {row[0] for row in result.all()}
    for key, value in DEFAULT_CONTENT.items():
        if key not in existing:
            db.add(SiteContent(key=key, value=value))
    if set(DEFAULT_CONTENT.keys()) - existing:
        await db.flush()


@router.get("")
async def get_all_content(db: AsyncSession = Depends(get_db)):
    """Public endpoint - returns all site content for the landing page."""
    await _ensure_defaults(db)
    result = await db.execute(select(SiteContent))
    rows = result.scalars().all()
    return {row.key: row.value for row in rows}


@router.put("/{key}")
async def update_content(
    key: str,
    request: Request,
    user=Depends(require_user),
    _pin=Depends(require_pin),
    db: AsyncSession = Depends(get_db),
):
    """PIN-protected endpoint - update a content section."""
    body = await request.json()
    existing = await db.execute(select(SiteContent).where(SiteContent.key == key))
    row = existing.scalar_one_or_none()
    if row:
        row.value = body
    else:
        db.add(SiteContent(key=key, value=body))
    await db.flush()
    return {"key": key, "value": body}
