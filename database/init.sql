-- ChoreMax v1.0 Database Schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Parent accounts
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    pin_hash        TEXT,
    currency        TEXT NOT NULL DEFAULT 'AUD',
    timezone        TEXT NOT NULL DEFAULT 'Australia/Sydney',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Children under a parent account
CREATE TABLE IF NOT EXISTS children (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    avatar_type     TEXT NOT NULL DEFAULT 'builtin',
    avatar_value    TEXT NOT NULL DEFAULT 'bear',
    display_order   INTEGER NOT NULL DEFAULT 0,
    birthday        DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Chore definitions
CREATE TABLE IF NOT EXISTS chores (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    description       TEXT,
    emoji             TEXT NOT NULL DEFAULT '⭐',
    image_url         TEXT,
    value             NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    frequency         TEXT NOT NULL DEFAULT 'daily',
    assignment_type   TEXT NOT NULL DEFAULT 'per-child',
    is_template       BOOLEAN NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Which children are assigned to which chores
CREATE TABLE IF NOT EXISTS chore_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id        UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chore_id, child_id)
);

-- Log of completed chores
CREATE TABLE IF NOT EXISTS chore_completions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id        UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    period_date     DATE NOT NULL,
    value_earned    NUMERIC(10,2) NOT NULL,
    completed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Piggy bank transaction ledger
CREATE TABLE IF NOT EXISTS piggy_bank_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    amount          NUMERIC(10,2) NOT NULL,
    description     TEXT,
    reference_id    UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Savings targets / goals
CREATE TABLE IF NOT EXISTS targets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    target_type     TEXT NOT NULL DEFAULT 'monetary',
    target_value    NUMERIC(10,2) NOT NULL,
    emoji           TEXT DEFAULT '🎯',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    achieved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Reminder preferences per user
CREATE TABLE IF NOT EXISTS reminder_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    morning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    morning_time    TIME NOT NULL DEFAULT '06:00',
    evening_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    evening_time    TIME NOT NULL DEFAULT '18:00',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_children_user            ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_chores_user              ON chores(user_id);
CREATE INDEX IF NOT EXISTS idx_chore_assign_chore       ON chore_assignments(chore_id);
CREATE INDEX IF NOT EXISTS idx_chore_assign_child       ON chore_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_completions_chore        ON chore_completions(chore_id);
CREATE INDEX IF NOT EXISTS idx_completions_child        ON chore_completions(child_id);
CREATE INDEX IF NOT EXISTS idx_completions_period       ON chore_completions(period_date);
CREATE INDEX IF NOT EXISTS idx_completions_child_period  ON chore_completions(child_id, period_date);
CREATE INDEX IF NOT EXISTS idx_piggy_child              ON piggy_bank_transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_piggy_created            ON piggy_bank_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_targets_child            ON targets(child_id);
CREATE INDEX IF NOT EXISTS idx_targets_active           ON targets(child_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_reminder_user            ON reminder_settings(user_id);
