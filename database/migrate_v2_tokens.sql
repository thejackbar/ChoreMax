-- ChoreMax v2 Migration: Piggy Bank -> Token System
-- Run this on the production database BEFORE deploying v2 code
-- Usage: docker compose exec db psql -U choremax -d choremax -f /docker-entrypoint-initdb.d/migrate_v2_tokens.sql

BEGIN;

-- 1. Add new columns to children
ALTER TABLE children ADD COLUMN IF NOT EXISTS token_icon TEXT NOT NULL DEFAULT 'star';
ALTER TABLE children ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#6366f1';

-- 2. Add new columns to chores
ALTER TABLE chores ADD COLUMN IF NOT EXISTS time_of_day TEXT NOT NULL DEFAULT 'anytime';
ALTER TABLE chores ADD COLUMN IF NOT EXISTS times_per_week INTEGER NOT NULL DEFAULT 1;

-- 3. Convert chores.value from NUMERIC to INTEGER (tokens)
-- Multiplier: x10 (so $0.50 -> 5 tokens, $2.00 -> 20 tokens)
ALTER TABLE chores ADD COLUMN IF NOT EXISTS value_new INTEGER;
UPDATE chores SET value_new = ROUND(value * 10)::INTEGER WHERE value_new IS NULL;
-- We can't easily drop+rename in one go with IF NOT EXISTS, so handle gracefully
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chores' AND column_name='value' AND data_type='numeric') THEN
        ALTER TABLE chores DROP COLUMN value;
        ALTER TABLE chores RENAME COLUMN value_new TO value;
        ALTER TABLE chores ALTER COLUMN value SET NOT NULL;
        ALTER TABLE chores ALTER COLUMN value SET DEFAULT 0;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chores' AND column_name='value_new') THEN
        ALTER TABLE chores DROP COLUMN value_new;
    END IF;
END $$;

-- 4. Convert chore_completions.value_earned to tokens_earned
ALTER TABLE chore_completions ADD COLUMN IF NOT EXISTS tokens_earned INTEGER NOT NULL DEFAULT 0;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chore_completions' AND column_name='value_earned') THEN
        UPDATE chore_completions SET tokens_earned = ROUND(value_earned * 10)::INTEGER WHERE tokens_earned = 0 AND value_earned > 0;
        ALTER TABLE chore_completions DROP COLUMN value_earned;
    END IF;
END $$;

-- 5. Create token_transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    amount          INTEGER NOT NULL,
    description     TEXT,
    reference_id    UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_token_txn_child ON token_transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_token_txn_created ON token_transactions(created_at DESC);

-- 6. Migrate piggy_bank_transactions to token_transactions
-- Only migrate if piggy_bank_transactions exists and token_transactions is empty
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='piggy_bank_transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM token_transactions LIMIT 1) THEN
            INSERT INTO token_transactions (child_id, type, amount, description, reference_id, created_at)
            SELECT
                child_id,
                type,
                ROUND(amount * 10)::INTEGER,
                description,
                reference_id,
                created_at
            FROM piggy_bank_transactions;
        END IF;
    END IF;
END $$;

-- 7. Create goal_activities table
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
CREATE INDEX IF NOT EXISTS idx_goal_activities_user ON goal_activities(user_id);

-- 8. Create goal_redemptions table
CREATE TABLE IF NOT EXISTS goal_redemptions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id          UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    goal_activity_id  UUID NOT NULL REFERENCES goal_activities(id) ON DELETE CASCADE,
    tokens_spent      INTEGER NOT NULL,
    redeemed_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goal_redemptions_child ON goal_redemptions(child_id);

-- 9. Migrate targets to goal_activities
-- Convert per-child targets to family-wide goal activities
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='targets') THEN
        IF NOT EXISTS (SELECT 1 FROM goal_activities LIMIT 1) THEN
            INSERT INTO goal_activities (user_id, title, token_cost, emoji, is_active, created_at)
            SELECT DISTINCT ON (t.title)
                c.user_id,
                t.title,
                ROUND(t.target_value * 10)::INTEGER,
                COALESCE(t.emoji, '🎯'),
                TRUE,
                t.created_at
            FROM targets t
            JOIN children c ON t.child_id = c.id
            WHERE t.is_active = TRUE
            ORDER BY t.title, t.created_at;

            -- Create redemptions for achieved targets
            INSERT INTO goal_redemptions (child_id, goal_activity_id, tokens_spent, redeemed_at)
            SELECT
                t.child_id,
                ga.id,
                ROUND(t.target_value * 10)::INTEGER,
                t.achieved_at
            FROM targets t
            JOIN children c ON t.child_id = c.id
            JOIN goal_activities ga ON ga.title = t.title AND ga.user_id = c.user_id
            WHERE t.achieved_at IS NOT NULL;
        END IF;
    END IF;
END $$;

COMMIT;

-- Done! Old tables (piggy_bank_transactions, targets) are preserved but no longer used.
-- They can be dropped in a future migration after verifying data integrity.
