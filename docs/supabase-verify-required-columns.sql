-- Run this in Supabase SQL Editor.
-- If the result is empty, the required SaaS/Agent columns exist.

WITH required(table_name, column_name) AS (
    VALUES
        ('groups', 'user_id'),
        ('posts', 'user_id'),
        ('campaigns', 'user_id'),
        ('campaigns', 'publish_method'),
        ('publish_posts', 'user_id'),
        ('publish_posts', 'publish_method'),
        ('publish_posts', 'is_scheduled'),
        ('publish_posts', 'scheduled_start_time'),
        ('publish_posts', 'delay_minutes'),
        ('publish_posts', 'delay_max_minutes'),
        ('subscriptions', 'service_key'),
        ('subscriptions', 'service_name'),
        ('subscriptions', 'amount_cents'),
        ('subscriptions', 'currency'),
        ('payments', 'service_key'),
        ('payments', 'service_name'),
        ('schedules', 'user_id'),
        ('bot_logs', 'user_id'),
        ('bot_configs', 'user_id'),
        ('ai_insights', 'user_id')
)
SELECT
    required.table_name,
    required.column_name,
    'missing' AS status
FROM required
LEFT JOIN information_schema.columns columns
    ON columns.table_schema = 'public'
    AND columns.table_name = required.table_name
    AND columns.column_name = required.column_name
WHERE columns.column_name IS NULL
ORDER BY required.table_name, required.column_name;
