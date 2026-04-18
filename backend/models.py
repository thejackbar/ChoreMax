import uuid
from datetime import datetime, time

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, Time,
    UniqueConstraint, func, CheckConstraint
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    pin_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    currency: Mapped[str] = mapped_column(Text, nullable=False, server_default="AUD")
    timezone: Mapped[str] = mapped_column(Text, nullable=False, server_default="Australia/Sydney")
    family_size: Mapped[int] = mapped_column(Integer, nullable=False, server_default="4")
    auto_add_ingredients_to_list: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    default_home_page: Mapped[str] = mapped_column(Text, nullable=False, server_default="family")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    children = relationship("Child", back_populates="user", cascade="all, delete-orphan")
    chores = relationship("Chore", back_populates="user", cascade="all, delete-orphan")
    meals = relationship("Meal", back_populates="user", cascade="all, delete-orphan")
    meal_plan_entries = relationship("MealPlanEntry", back_populates="user", cascade="all, delete-orphan")
    reminder_setting = relationship("ReminderSetting", back_populates="user", uselist=False, cascade="all, delete-orphan")
    goal_activities = relationship("GoalActivity", back_populates="user", cascade="all, delete-orphan")
    todo_items = relationship("TodoItem", back_populates="user", cascade="all, delete-orphan")
    calendar_connections = relationship("CalendarConnection", back_populates="user", cascade="all, delete-orphan")


class Child(Base):
    __tablename__ = "children"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_type: Mapped[str] = mapped_column(Text, nullable=False, server_default="builtin")
    avatar_value: Mapped[str] = mapped_column(Text, nullable=False, server_default="bear")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    birthday: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    token_icon: Mapped[str] = mapped_column(Text, nullable=False, server_default="star")
    color: Mapped[str] = mapped_column(Text, nullable=False, server_default="#6366f1")
    role: Mapped[str] = mapped_column(Text, nullable=False, server_default="child")
    gender: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="children")
    chore_assignments = relationship("ChoreAssignment", back_populates="child", cascade="all, delete-orphan")
    completions = relationship("ChoreCompletion", back_populates="child", cascade="all, delete-orphan")
    token_transactions = relationship("TokenTransaction", back_populates="child", cascade="all, delete-orphan")
    goal_redemptions = relationship("GoalRedemption", back_populates="child", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="child", cascade="all, delete-orphan")


class Chore(Base):
    __tablename__ = "chores"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    emoji: Mapped[str] = mapped_column(Text, nullable=False, server_default="⭐")
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    frequency: Mapped[str] = mapped_column(Text, nullable=False, server_default="daily")
    time_of_day: Mapped[str] = mapped_column(Text, nullable=False, server_default="anytime")
    times_per_week: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    assignment_type: Mapped[str] = mapped_column(Text, nullable=False, server_default="per-child")
    is_template: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="chores")
    assignments = relationship("ChoreAssignment", back_populates="chore", cascade="all, delete-orphan")
    completions = relationship("ChoreCompletion", back_populates="chore", cascade="all, delete-orphan")


class ChoreAssignment(Base):
    __tablename__ = "chore_assignments"
    __table_args__ = (UniqueConstraint("chore_id", "child_id"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    chore_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("chores.id", ondelete="CASCADE"), nullable=False, index=True)
    child_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chore = relationship("Chore", back_populates="assignments")
    child = relationship("Child", back_populates="chore_assignments")


class ChoreCompletion(Base):
    __tablename__ = "chore_completions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    chore_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("chores.id", ondelete="CASCADE"), nullable=False, index=True)
    child_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    period_date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    tokens_earned: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chore = relationship("Chore", back_populates="completions")
    child = relationship("Child", back_populates="completions")


class TokenTransaction(Base):
    __tablename__ = "token_transactions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    child_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    child = relationship("Child", back_populates="token_transactions")


class GoalActivity(Base):
    __tablename__ = "goal_activities"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    token_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    emoji: Mapped[str] = mapped_column(Text, nullable=False, server_default="🎯")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="goal_activities")
    redemptions = relationship("GoalRedemption", back_populates="goal_activity", cascade="all, delete-orphan")


class GoalRedemption(Base):
    __tablename__ = "goal_redemptions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    child_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    goal_activity_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("goal_activities.id", ondelete="CASCADE"), nullable=False)
    tokens_spent: Mapped[int] = mapped_column(Integer, nullable=False)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    child = relationship("Child", back_populates="goal_redemptions")
    goal_activity = relationship("GoalActivity", back_populates="redemptions")


class TodoItem(Base):
    __tablename__ = "todo_items"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(Text, nullable=False, server_default="general")
    priority: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    due_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="todo_items")


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    child_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    emoji: Mapped[str] = mapped_column(Text, nullable=False, server_default="⭐")
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_purchased: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    child = relationship("Child", back_populates="wishlist_items")


class ReminderSetting(Base):
    __tablename__ = "reminder_settings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    morning_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    morning_time: Mapped[time] = mapped_column(Time, nullable=False, server_default="06:00")
    evening_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    evening_time: Mapped[time] = mapped_column(Time, nullable=False, server_default="18:00")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="reminder_setting")


class Meal(Base):
    __tablename__ = "meals"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    categories: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, server_default="{}")
    image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    servings: Mapped[int] = mapped_column(Integer, nullable=False, server_default="4")
    max_per_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="meals")
    ingredients = relationship("MealIngredient", back_populates="meal", cascade="all, delete-orphan")
    meal_plan_entries = relationship("MealPlanEntry", back_populates="meal", cascade="all, delete-orphan")


class MealIngredient(Base):
    __tablename__ = "meal_ingredients"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    meal_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("meals.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, server_default="1")
    unit: Mapped[str] = mapped_column(Text, nullable=False, server_default="piece")
    category: Mapped[str] = mapped_column(Text, nullable=False, server_default="pantry")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    meal = relationship("Meal", back_populates="ingredients")


class MealPlanEntry(Base):
    __tablename__ = "meal_plan_entries"
    __table_args__ = (UniqueConstraint("user_id", "week_start", "day_of_week", "slot"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    week_start: Mapped[datetime] = mapped_column(Date, nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    slot: Mapped[str] = mapped_column(Text, nullable=False)
    meal_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("meals.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="meal_plan_entries")
    meal = relationship("Meal", back_populates="meal_plan_entries")


class ShoppingListCheck(Base):
    __tablename__ = "shopping_list_checks"
    __table_args__ = (UniqueConstraint("user_id", "week_start", "ingredient_name", "ingredient_unit"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    week_start: Mapped[datetime] = mapped_column(Date, nullable=False)
    ingredient_name: Mapped[str] = mapped_column(Text, nullable=False)
    ingredient_unit: Mapped[str] = mapped_column(Text, nullable=False)
    checked: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CalendarConnection(Base):
    __tablename__ = "calendar_connections"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(Text, nullable=False)  # "google" or "ical"
    name: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str] = mapped_column(Text, nullable=False, server_default="#3b82f6")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    # Google OAuth fields
    google_access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_token_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    google_email: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_calendar_id: Mapped[str | None] = mapped_column(Text, nullable=True)  # Google calendar ID (e.g. "primary", "en.australian#holiday@group.v.calendar.google.com")
    # iCal fields
    ical_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="calendar_connections")
    events = relationship("CalendarEvent", back_populates="connection", cascade="all, delete-orphan")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    __table_args__ = (UniqueConstraint("connection_id", "external_id"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    connection_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("calendar_connections.id", ondelete="CASCADE"), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    is_all_day: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # ChoreMax-specific assignment (not synced to external calendars)
    assigned_children: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)

    connection = relationship("CalendarConnection", back_populates="events")


class SiteContent(Base):
    __tablename__ = "site_content"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    feature: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
