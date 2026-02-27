import uuid
from datetime import datetime, time

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Time,
    UniqueConstraint, func
)
from sqlalchemy.dialects.postgresql import UUID
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    children = relationship("Child", back_populates="user", cascade="all, delete-orphan")
    chores = relationship("Chore", back_populates="user", cascade="all, delete-orphan")
    reminder_setting = relationship("ReminderSetting", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Child(Base):
    __tablename__ = "children"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_type: Mapped[str] = mapped_column(Text, nullable=False, server_default="builtin")
    avatar_value: Mapped[str] = mapped_column(Text, nullable=False, server_default="bear")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    birthday: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="children")
    chore_assignments = relationship("ChoreAssignment", back_populates="child", cascade="all, delete-orphan")
    completions = relationship("ChoreCompletion", back_populates="child", cascade="all, delete-orphan")
    piggy_bank_transactions = relationship("PiggyBankTransaction", back_populates="child", cascade="all, delete-orphan")
    targets = relationship("Target", back_populates="child", cascade="all, delete-orphan")


class Chore(Base):
    __tablename__ = "chores"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    emoji: Mapped[str] = mapped_column(Text, nullable=False, server_default="⭐")
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, server_default="0.00")
    frequency: Mapped[str] = mapped_column(Text, nullable=False, server_default="daily")
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
    value_earned: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chore = relationship("Chore", back_populates="completions")
    child = relationship("Child", back_populates="completions")


class PiggyBankTransaction(Base):
    __tablename__ = "piggy_bank_transactions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    child_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    child = relationship("Child", back_populates="piggy_bank_transactions")


class Target(Base):
    __tablename__ = "targets"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    child_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    target_type: Mapped[str] = mapped_column(Text, nullable=False, server_default="monetary")
    target_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    emoji: Mapped[str] = mapped_column(Text, server_default="🎯")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    achieved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    child = relationship("Child", back_populates="targets")


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
