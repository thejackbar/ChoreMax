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

class ChildCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    avatar_type: str = "builtin"
    avatar_value: str = "bear"
    birthday: date | None = None


class ChildUpdate(BaseModel):
    name: str | None = None
    avatar_type: str | None = None
    avatar_value: str | None = None
    display_order: int | None = None
    birthday: date | None = None


class ChildResponse(OrmBase):
    id: str
    name: str
    avatar_type: str
    avatar_value: str
    display_order: int
    birthday: date | None = None
    created_at: datetime


class ChildReorderRequest(BaseModel):
    child_ids: list[str]


# ---------------------------------------------------------------------------
# Chores
# ---------------------------------------------------------------------------

class ChoreCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    emoji: str = "⭐"
    value: Decimal = Field(..., ge=0, decimal_places=2)
    frequency: Literal["daily", "weekly"] = "daily"
    assignment_type: Literal["standalone", "per-child"] = "per-child"
    assigned_child_ids: list[str] | None = None


class ChoreUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    emoji: str | None = None
    value: Decimal | None = Field(default=None, ge=0)
    frequency: Literal["daily", "weekly"] | None = None
    assignment_type: Literal["standalone", "per-child"] | None = None
    is_active: bool | None = None
    assigned_child_ids: list[str] | None = None


class ChoreResponse(OrmBase):
    id: str
    title: str
    description: str | None
    emoji: str
    value: Decimal
    frequency: str
    assignment_type: str
    is_active: bool
    assigned_child_ids: list[str] = []
    created_at: datetime


class ChoreWithStatusResponse(OrmBase):
    id: str
    title: str
    description: str | None
    emoji: str
    value: Decimal
    frequency: str
    assignment_type: str
    completed: bool = False
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
    value_earned: Decimal
    completed_at: datetime


# ---------------------------------------------------------------------------
# Piggy Bank
# ---------------------------------------------------------------------------

class CashOutRequest(BaseModel):
    child_id: str
    amount: Decimal = Field(..., gt=0)
    description: str | None = "Cash out"


class AdjustmentRequest(BaseModel):
    child_id: str
    amount: Decimal = Field(..., gt=0)
    type: Literal["add", "subtract"]
    description: str | None = None


class PiggyBankBalanceResponse(BaseModel):
    child_id: str
    child_name: str
    balance: Decimal
    total_earned: Decimal
    total_cashed_out: Decimal


class TransactionResponse(OrmBase):
    id: str
    child_id: str
    type: str
    amount: Decimal
    description: str | None
    created_at: datetime


class TransactionListResponse(BaseModel):
    transactions: list[TransactionResponse]
    total: int
    page: int
    per_page: int
    pages: int


# ---------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------

class TargetCreate(BaseModel):
    child_id: str
    title: str = Field(..., min_length=1)
    target_type: Literal["monetary", "item"] = "monetary"
    target_value: Decimal = Field(..., gt=0)
    emoji: str = "🎯"


class TargetUpdate(BaseModel):
    title: str | None = None
    target_type: Literal["monetary", "item"] | None = None
    target_value: Decimal | None = Field(default=None, gt=0)
    emoji: str | None = None


class TargetResponse(OrmBase):
    id: str
    child_id: str
    title: str
    target_type: str
    target_value: Decimal
    emoji: str
    is_active: bool
    achieved_at: datetime | None
    progress_amount: Decimal = Decimal("0.00")
    progress_pct: float = 0.0
    created_at: datetime


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
    daily_completed: int
    daily_total: int
    weekly_completed: int
    weekly_total: int
    piggy_bank_balance: Decimal
    target: TargetResponse | None = None
    uncompleted_daily: list[ChoreWithStatusResponse] = []
    uncompleted_weekly: list[ChoreWithStatusResponse] = []


class ChildStatsResponse(BaseModel):
    child_id: str
    child_name: str
    avatar_type: str
    avatar_value: str
    daily_completed: int
    daily_total: int
    weekly_completed: int
    weekly_total: int
    piggy_bank_balance: Decimal
    completion_pct: float


class ParentDashboardResponse(BaseModel):
    children_stats: list[ChildStatsResponse]
    total_earnings: Decimal
    total_completions: int
    total_chores: int
    overall_completion_pct: float


class StatsDataPoint(BaseModel):
    label: str
    completed: int
    total: int
    earnings: Decimal


class DetailedStatsResponse(BaseModel):
    child_id: str | None
    child_name: str | None
    period: str
    data_points: list[StatsDataPoint]
    total_completed: int
    total_chores: int
    total_earnings: Decimal
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
