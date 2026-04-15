-- Phase 4: per-user settings additions
-- Run: docker exec -i choremax-db-1 psql -U choremax choremax < database/migrate_v4_settings.sql

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS auto_add_ingredients_to_list BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS default_home_page TEXT NOT NULL DEFAULT 'family';

COMMIT;
