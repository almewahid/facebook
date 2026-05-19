CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    full_name VARCHAR,
    password_hash VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_users_role ON users (role);

CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR NOT NULL,
    category VARCHAR DEFAULT 'عام',
    url VARCHAR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_groups_user_id ON groups (user_id);
CREATE INDEX IF NOT EXISTS ix_groups_name ON groups (name);
CREATE INDEX IF NOT EXISTS ix_groups_category ON groups (category);

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    group_id INTEGER NOT NULL REFERENCES groups(id),
    content TEXT NOT NULL,
    image_path VARCHAR,
    status VARCHAR DEFAULT 'pending',
    post_url VARCHAR,
    error_message TEXT,
    cycle_number INTEGER,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_posts_user_id ON posts (user_id);

CREATE TABLE IF NOT EXISTS publish_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    image_paths TEXT,
    video_path VARCHAR,
    publish_method VARCHAR DEFAULT 'new_post',
    status VARCHAR DEFAULT 'pending',
    total_groups INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    target_group_ids TEXT,
    is_scheduled BOOLEAN DEFAULT false,
    scheduled_start_time TIMESTAMP WITHOUT TIME ZONE,
    delay_minutes INTEGER DEFAULT 5,
    delay_max_minutes INTEGER DEFAULT 5,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    published_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_publish_posts_user_id ON publish_posts (user_id);

CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'draft',
    post_ids TEXT,
    publish_method VARCHAR DEFAULT 'new_post',
    rotation_strategy VARCHAR DEFAULT 'sequential',
    schedule_plan TEXT,
    delay_between_posts INTEGER DEFAULT 5,
    total_groups INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    created_by VARCHAR NOT NULL,
    started_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_campaigns_user_id ON campaigns (user_id);

CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR NOT NULL,
    schedule_type VARCHAR NOT NULL,
    time_slots TEXT,
    days_of_week TEXT,
    rest_days TEXT,
    week_start_day INTEGER DEFAULT 5,
    delay_between_posts INTEGER DEFAULT 300,
    random_delay BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_schedules_user_id ON schedules (user_id);

CREATE TABLE IF NOT EXISTS bot_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    key VARCHAR NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT uq_bot_configs_user_key UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS ix_bot_configs_user_id ON bot_configs (user_id);
CREATE INDEX IF NOT EXISTS ix_bot_configs_key ON bot_configs (key);

CREATE TABLE IF NOT EXISTS bot_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    level VARCHAR NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_bot_logs_user_id ON bot_logs (user_id);

CREATE TABLE IF NOT EXISTS ai_insights (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    insight TEXT NOT NULL,
    category VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ai_insights_user_id ON ai_insights (user_id);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    plan VARCHAR NOT NULL,
    service_key VARCHAR DEFAULT 'new_post',
    service_name VARCHAR,
    status VARCHAR DEFAULT 'pending',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR,
    payment_reference VARCHAR,
    amount_cents INTEGER,
    currency VARCHAR DEFAULT 'EGP',
    provider VARCHAR DEFAULT 'manual',
    provider_customer_id VARCHAR,
    provider_subscription_id VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS ix_subscriptions_plan ON subscriptions (plan);
CREATE INDEX IF NOT EXISTS ix_subscriptions_status ON subscriptions (status);
CREATE INDEX IF NOT EXISTS ix_subscriptions_provider ON subscriptions (provider);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subscription_id INTEGER REFERENCES subscriptions(id),
    plan VARCHAR NOT NULL,
    service_key VARCHAR DEFAULT 'new_post',
    service_name VARCHAR,
    status VARCHAR DEFAULT 'pending',
    payment_method VARCHAR DEFAULT 'manual',
    payment_reference VARCHAR,
    proof_url VARCHAR,
    amount_cents INTEGER,
    currency VARCHAR DEFAULT 'EGP',
    provider VARCHAR DEFAULT 'manual',
    provider_payment_id VARCHAR,
    raw_payload TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS ix_payments_subscription_id ON payments (subscription_id);
CREATE INDEX IF NOT EXISTS ix_payments_plan ON payments (plan);
CREATE INDEX IF NOT EXISTS ix_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS ix_payments_payment_method ON payments (payment_method);
CREATE INDEX IF NOT EXISTS ix_payments_provider ON payments (provider);
