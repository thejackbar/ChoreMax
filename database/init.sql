-- ChoreMax v2.0 Database Schema
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
    family_size     INTEGER NOT NULL DEFAULT 4,
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
    token_icon      TEXT NOT NULL DEFAULT 'star',
    color           TEXT NOT NULL DEFAULT '#6366f1',
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
    value             INTEGER NOT NULL DEFAULT 0,
    frequency         TEXT NOT NULL DEFAULT 'daily',
    time_of_day       TEXT NOT NULL DEFAULT 'anytime' CHECK (time_of_day IN ('morning', 'evening', 'anytime')),
    times_per_week    INTEGER NOT NULL DEFAULT 1 CHECK (times_per_week >= 1 AND times_per_week <= 7),
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
    tokens_earned   INTEGER NOT NULL DEFAULT 0,
    completed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Token transaction ledger (replaces piggy_bank_transactions)
CREATE TABLE IF NOT EXISTS token_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    amount          INTEGER NOT NULL,
    description     TEXT,
    reference_id    UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Goal activities (family-wide reusable rewards)
CREATE TABLE IF NOT EXISTS goal_activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    token_cost      INTEGER NOT NULL CHECK (token_cost > 0),
    emoji           TEXT NOT NULL DEFAULT '🎯',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Goal redemptions (when a child cashes in tokens for a goal)
CREATE TABLE IF NOT EXISTS goal_redemptions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    goal_activity_id  UUID NOT NULL REFERENCES goal_activities(id) ON DELETE CASCADE,
    tokens_spent      INTEGER NOT NULL,
    redeemed_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy tables kept for migration (will be removed in future version)
-- piggy_bank_transactions and targets may still exist from v1

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

-- Meal definitions
CREATE TABLE IF NOT EXISTS meals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    categories      TEXT[] NOT NULL DEFAULT '{}',
    image_path      TEXT,
    servings        INTEGER NOT NULL DEFAULT 4,
    max_per_week    INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Meal ingredients
CREATE TABLE IF NOT EXISTS meal_ingredients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id         UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit            TEXT NOT NULL DEFAULT 'piece',
    category        TEXT NOT NULL DEFAULT 'pantry',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly meal plan entries
CREATE TABLE IF NOT EXISTS meal_plan_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start      DATE NOT NULL,
    day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    slot            TEXT NOT NULL CHECK (slot IN ('breakfast','lunch','dinner')),
    meal_id         UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start, day_of_week, slot)
);

-- Shopping list check tracking
CREATE TABLE IF NOT EXISTS shopping_list_checks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start      DATE NOT NULL,
    ingredient_name TEXT NOT NULL,
    ingredient_unit TEXT NOT NULL,
    checked         BOOLEAN NOT NULL DEFAULT FALSE,
    checked_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start, ingredient_name, ingredient_unit)
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
CREATE INDEX IF NOT EXISTS idx_token_txn_child          ON token_transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_token_txn_created        ON token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goal_activities_user     ON goal_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_redemptions_child   ON goal_redemptions(child_id);
CREATE INDEX IF NOT EXISTS idx_piggy_child              ON piggy_bank_transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_piggy_created            ON piggy_bank_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_targets_child            ON targets(child_id);
CREATE INDEX IF NOT EXISTS idx_targets_active           ON targets(child_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_reminder_user            ON reminder_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_user               ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal     ON meal_ingredients(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_user_week       ON meal_plan_entries(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meal            ON meal_plan_entries(meal_id);
CREATE INDEX IF NOT EXISTS idx_shopping_checks_user_week ON shopping_list_checks(user_id, week_start);
