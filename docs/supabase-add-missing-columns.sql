-- Run this once in Supabase SQL Editor if docs/supabase-verify-required-columns.sql returns missing rows.
-- These ALTER statements are safe to repeat because they use IF NOT EXISTS.

ALTER TABLE groups ADD COLUMN IF NOT EXISTS user_id INTEGER;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_id INTEGER;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS publish_method VARCHAR DEFAULT 'new_post';

ALTER TABLE publish_posts ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE publish_posts ADD COLUMN IF NOT EXISTS publish_method VARCHAR DEFAULT 'new_post';
ALTER TABLE publish_posts ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;
ALTER TABLE publish_posts ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE publish_posts ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 5;
ALTER TABLE publish_posts ADD COLUMN IF NOT EXISTS delay_max_minutes INTEGER DEFAULT 5;

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS service_key VARCHAR DEFAULT 'new_post';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS service_name VARCHAR;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_cents INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'USD';

ALTER TABLE payments ADD COLUMN IF NOT EXISTS service_key VARCHAR DEFAULT 'new_post';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS service_name VARCHAR;

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE bot_logs ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE bot_configs ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS user_id INTEGER;

CREATE INDEX IF NOT EXISTS ix_groups_user_id ON groups (user_id);
CREATE INDEX IF NOT EXISTS ix_posts_user_id ON posts (user_id);
CREATE INDEX IF NOT EXISTS ix_campaigns_user_id ON campaigns (user_id);
CREATE INDEX IF NOT EXISTS ix_publish_posts_user_id ON publish_posts (user_id);
CREATE INDEX IF NOT EXISTS ix_schedules_user_id ON schedules (user_id);
CREATE INDEX IF NOT EXISTS ix_bot_logs_user_id ON bot_logs (user_id);
CREATE INDEX IF NOT EXISTS ix_bot_configs_user_id ON bot_configs (user_id);
CREATE INDEX IF NOT EXISTS ix_ai_insights_user_id ON ai_insights (user_id);
