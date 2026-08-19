-- LearnLens Auth Tables
-- Run this once in your Supabase SQL Editor before starting the backend.

CREATE TABLE IF NOT EXISTS ll_users (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT         UNIQUE NOT NULL,
  name        TEXT         NOT NULL,
  password_hash TEXT       NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ll_sessions (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES ll_users(id) ON DELETE CASCADE,
  token       TEXT         UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ll_sessions_token_idx   ON ll_sessions(token);
CREATE INDEX IF NOT EXISTS ll_sessions_user_id_idx ON ll_sessions(user_id);

-- Backend accesses these tables with the service role key (SUPABASE_KEY),
-- which bypasses Row Level Security automatically.
-- If you plan direct client access too, define RLS policies instead.
ALTER TABLE ll_users    DISABLE ROW LEVEL SECURITY;
ALTER TABLE ll_sessions DISABLE ROW LEVEL SECURITY;
