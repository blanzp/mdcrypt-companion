-- Step 2 (after the new code is live): drop the mdcrypt API-key settings. mdcrypt is shut down.
ALTER TABLE users
  DROP COLUMN IF EXISTS mcp_api_key,
  DROP COLUMN IF EXISTS mcp_shared_api_key,
  DROP COLUMN IF EXISTS mcp_crypt_id,
  DROP COLUMN IF EXISTS mcp_shared_crypt_id;
