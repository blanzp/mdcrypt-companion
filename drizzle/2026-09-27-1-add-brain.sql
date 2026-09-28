-- Step 1 (before deploying): the second brain OAuth connection. Safe to run more than once.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS brain_client_id text,
  ADD COLUMN IF NOT EXISTS brain_access_token text,
  ADD COLUMN IF NOT EXISTS brain_refresh_token text,
  ADD COLUMN IF NOT EXISTS brain_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS brain_login text,
  ADD COLUMN IF NOT EXISTS brain_repo text;
