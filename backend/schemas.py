from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    display_name: str = Field(..., min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(OrmBase):
    id: str
    email: str
    display_name: str
    currency: str
    timezone: str
    family_size: int = 4
    has_pin: bool = False
    created_at: datetime


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# ---------------------------------------------------------------------------
# Children
# ---------------------------------------------------------------------------

TOKEN_ICONS = Literal[
    "star", "soccer", "heart", "lightning", "diamond",
    "flame", "music", "rocket", "rainbow", "paw",
]


class ChildCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    avatar_type: str = "builtin"
    avatar_value: str = "bear"
    birthday: date | None = None
    token_icon: TOKEN_ICONS = "star"
    color: str = "#6366f1"


class ChildUpdate(BaseModel):
    name: str | None = None
    avatar_type: str | None = None
    avatar_value: str | None = None
    display_order: int | None = None
    birthday: date | None = None
    token_icon: TOKEN_ICONS | None = None
    color: str | None = None


class ChildResponse(OrmBase):
    id: str
    name: str
    avatar_type: str
    avatar_value: str
    display_order: int
    birthday: date | None = None
    token_icon: str = "star"
    color: str = "#6366f1"
    created_at: datetime


class ChildReorderRequest(BaseModel):
    child_ids: list[str]


# ---------------------------------------------------------------------------
# Chores
# ---------------------------------------------------------------------------

TIME_OF_DAY = Literal["morning", "evening", "anytime"]


class ChoreCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    emoji: str = "⭐"
    value: int = Field(..., ge=0)
    frequency: Literal["daily", "weekly"] = "daily"
    time_of_day: TIME_OF_DAY = "anytime"
    times_per_week: int = Field(default=1, ge=1, le=7)
    assignment_type: Literal["standalone", "per-child"] = "per-child"
    assigned_child_ids: list[str] | None = None


class ChoreUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    emoji: str | None = None
    value: int | None = Field(default=None, ge=0)
    frequency: Literal["daily", "weekly"] | None = None
    time_of_day: TIME_OF_DAY | None = None
    times_per_week: int | None = Field(default=None, ge=1, le=7)
    assignment_type: Literal["standalone", "per-child"] | None = None
    is_active: bool | None = None
    assigned_child_ids: list[str] | None = None


class ChoreResponse(OrmBase):
    id: str
    title: str
    description: str | None
    emoji: str
    value: int
    frequency: str
    time_of_day: str = "anytime"
    times_per_week: int = 1
    assignment_type: str
    is_active: bool
    assigned_child_ids: list[str] = []
    created_at: datetime


class ChoreWithStatusResponse(OrmBase):
    id: str
    title: str
    description: str | None
    emoji: str
    value: int
    frequency: str
    time_of_day: str = "anytime"
    times_per_week: int = 1
    assignment_type: str
    completed: bool = False
    completions_done: int = 0
    max_completions: int = 1
    completed_by: str | None = None
    completed_by_name: str | None = None
    completion_id: str | None = None


# ---------------------------------------------------------------------------
# Completions
# ---------------------------------------------------------------------------

class CompleteChoreRequest(BaseModel):
    chore_id: str
    child_id: str
    for_date: date | None = None


class CompletionResponse(OrmBase):
    id: str
    chore_id: str
    child_id: str
    period_date: date
    tokens_earned: int
    completed_at: datetime


# ---------------------------------------------------------------------------
# Token System (replaces Piggy Bank)
# ---------------------------------------------------------------------------

class TokenAdjustmentRequest(BaseModel):
    child_id: str
    amount: int = Field(..., gt=0)
    type: Literal["add", "subtract"]
    description: str | None = None


class TokenBalanceResponse(BaseModel):
    child_id: str
    child_name: str
    token_icon: str
    balance: int
    total_earned: int
    total_spent: int


class TokenTransactionResponse(OrmBase):
    id: str
    child_id: str
    type: str
    amount: int
    description: str | None
    created_at: datetime


class TokenTransactionListResponse(BaseModel):
    transactions: list[TokenTransactionResponse]
    total: int
    page: int
    per_page: int
    pages: int


# ---------------------------------------------------------------------------
# Goal Activities (replaces Targets)
# ---------------------------------------------------------------------------

class GoalActivityCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    token_cost: int = Field(..., gt=0)
    emoji: str = "🎯"


class GoalActivityUpdate(BaseModel):
    title: str | None = None
    token_cost: int | None = Field(default=None, gt=0)
    emoji: str | None = None
    is_active: bool | None = None


class GoalActivityResponse(OrmBase):
    id: str
    title: str
    token_cost: int
    emoji: str
    is_active: bool
    created_at: datetime


class GoalRedeemRequest(BaseModel):
    child_id: str


class GoalRedemptionResponse(OrmBase):
    id: str
    child_id: str
    goal_activity_id: str
    tokens_spent: int
    redeemed_at: datetime
    goal_title: str = ""
    goal_emoji: str = ""


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

class PinSetRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6, pattern=r"^\d{4,6}$")


class PinVerifyRequest(BaseModel):
    pin: str


class SettingsUpdate(BaseModel):
    currency: str | None = None
    timezone: str | None = None
    display_name: str | None = None
    family_size: int | None = Field(default=None, ge=1, le=20)


class ReminderSettingsUpdate(BaseModel):
    morning_enabled: bool | None = None
    morning_time: str | None = None
    evening_enabled: bool | None = None
    evening_time: str | None = None


class ReminderSettingsResponse(OrmBase):
    morning_enabled: bool
    morning_time: str
    evening_enabled: bool
    evening_time: str


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class ChildDashboardResponse(BaseModel):
    child_id: str
    child_name: str
    avatar_type: str
    avatar_value: str
    token_icon: str = "star"
    daily_completed: int
    daily_total: int
    weekly_completed: int
    weekly_total: int
    token_balance: int
    goals: list[GoalActivityResponse] = []
    uncompleted_daily: list[ChoreWithStatusResponse] = []
    uncompleted_weekly: list[ChoreWithStatusResponse] = []


class ChildStatsResponse(BaseModel):
    child_id: str
    child_name: str
    avatar_type: str
    avatar_value: str
    token_icon: str = "star"
    daily_completed: int
    daily_total: int
    weekly_completed: int
    weekly_total: int
    token_balance: int
    completion_pct: float


class ParentDashboardResponse(BaseModel):
    children_stats: list[ChildStatsResponse]
    total_tokens_earned: int
    total_completions: int
    total_chores: int
    overall_completion_pct: float


class StatsDataPoint(BaseModel):
    label: str
    completed: int
    total: int
    tokens: int


class DetailedStatsResponse(BaseModel):
    child_id: str | None
    child_name: str | None
    period: str
    data_points: list[StatsDataPoint]
    total_completed: int
    total_chores: int
    total_tokens: int
    completion_pct: float


# ---------------------------------------------------------------------------
# Meals
# ---------------------------------------------------------------------------

INGREDIENT_UNITS = Literal[
    "g", "kg", "ml", "L", "cup", "tbsp", "tsp", "piece",
    "bunch", "can", "packet", "slice", "clove", "pinch",
]

INGREDIENT_CATEGORIES = Literal[
    "produce", "dairy", "meat", "seafood", "pantry", "frozen",
    "bakery", "beverages", "condiments", "other",
]

MEAL_CATEGORIES = Literal["breakfast", "lunch", "dinner"]


class MealIngredientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    quantity: Decimal = Field(..., gt=0)
    unit: INGREDIENT_UNITS = "piece"
    category: INGREDIENT_CATEGORIES = "pantry"


class MealIngredientResponse(OrmBase):
    id: str
    name: str
    quantity: Decimal
    unit: str
    category: str


class MealCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    categories: list[MEAL_CATEGORIES]
    servings: int = Field(default=4, ge=1)
    max_per_week: int | None = Field(default=None, ge=1)
    ingredients: list[MealIngredientCreate] = []


class MealUpdate(BaseModel):
    name: str | None = None
    categories: list[MEAL_CATEGORIES] | None = None
    servings: int | None = Field(default=None, ge=1)
    max_per_week: int | None = None
    ingredients: list[MealIngredientCreate] | None = None


class MealResponse(OrmBase):
    id: str
    name: str
    categories: list[str]
    image_path: str | None
    servings: int
    max_per_week: int | None
    ingredients: list[MealIngredientResponse] = []
    created_at: datetime


# ---------------------------------------------------------------------------
# Meal Plans
# ---------------------------------------------------------------------------

MEAL_SLOTS = Literal["breakfast", "lunch", "dinner"]


class MealPlanEntryCreate(BaseModel):
    week_start: date
    day_of_week: int = Field(..., ge=0, le=6)
    slot: MEAL_SLOTS
    meal_id: str


class MealPlanEntryResponse(OrmBase):
    id: str
    week_start: date
    day_of_week: int
    slot: str
    meal: MealResponse
    created_at: datetime


class MealPlanWeekResponse(BaseModel):
    week_start: date
    entries: list[MealPlanEntryResponse]


# ---------------------------------------------------------------------------
# Shopping List
# ---------------------------------------------------------------------------

class ShoppingListItemResponse(BaseModel):
    ingredient_name: str
    ingredient_unit: str
    ingredient_category: str
    total_quantity: Decimal
    checked: bool = False


class ShoppingListResponse(BaseModel):
    week_start: date
    family_size: int
    items: list[ShoppingListItemResponse]


class ShoppingListCheckRequest(BaseModel):
    week_start: date
    ingredient_name: str
    ingredient_unit: str
    checked: bool


# ---------------------------------------------------------------------------
# Calendar
# ---------------------------------------------------------------------------

class CalendarConnectionCreate(BaseModel):
    provider: Literal["google", "ical"]
    name: str = Field(..., min_length=1, max_length=200)
    color: str = "#3b82f6"
    ical_url: str | None = None


class CalendarConnectionUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    is_enabled: bool | None = None
    ical_url: str | None = None


class CalendarConnectionResponse(OrmBase):
    id: str
    provider: str
    name: str
    color: str
    is_enabled: bool
    google_email: str | None = None
    google_calendar_id: str | None = None
    ical_url: str | None = None
    last_synced_at: datetime | None = None
    created_at: datetime


class CalendarEventResponse(BaseModel):
    id: str
    connection_id: str | None = None
    provider: str = ""  # "google" or "ical"
    title: str
    description: str | None = None
    start_date: date
    start_time: str | None = None
    end_date: date
    end_time: str | None = None
    is_all_day: bool = False
    location: str | None = None
    color: str = "#3b82f6"
    source: str = ""  # connection name


class CalendarDayResponse(BaseModel):
    date: date
    events: list[CalendarEventResponse] = []
    chores: list[dict] = []
    meals: list[dict] = []
