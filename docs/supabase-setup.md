# Supabase Setup

## 1. Create Project

Create a Supabase project, then open:

Project Settings -> Database -> Connection string

Use the PostgreSQL URI connection string. For Render, the Transaction pooler URI is usually the easiest choice.

## 2. Render Environment

Set this environment variable in Render:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Keep the existing variables:

```env
SECRET_KEY=change_this
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,http://localhost:3000
```

## 3. First Startup

The backend creates missing tables on startup through SQLAlchemy metadata.

After changing `DATABASE_URL`, restart Render. Then open Supabase Table Editor and confirm these tables exist:

- users
- subscriptions
- payments
- groups
- posts
- campaigns
- publish_posts
- bot_configs
- bot_logs

## 4. Make First Admin

After registering your account, run this in Supabase SQL Editor:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'osakr100@gmail.com';
```

Then log out and log in again.

## 5. Supabase Auth

Open:

Authentication -> Providers

Enable Email. To enable Google login, also enable Google provider and add the OAuth credentials from Google Cloud.

In Supabase Auth URL Configuration, set:

```text
Site URL: https://your-vercel-domain.vercel.app
Redirect URLs:
http://localhost:3000
https://your-vercel-domain.vercel.app
```

## 6. Vercel Environment

Use the Render backend URL:

```env
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 7. Notes

Supabase Auth is the login provider. The app still keeps a local `users` table for roles, subscriptions, and ownership isolation. The backend creates or matches a local user automatically from the Supabase Auth token.
