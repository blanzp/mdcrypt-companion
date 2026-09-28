import { createHash, randomBytes } from "crypto";
import { createMCPClient } from "@ai-sdk/mcp";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";

// Second brain MCP server (github.com/blanzp/second-brain-mcp): a Git-backed Markdown vault per user.
// We connect to it as an OAuth client on each user's behalf and store their tokens encrypted.
export const BRAIN_URL = process.env.BRAIN_URL ?? "https://brain.mdcrypt.dev";
const MCP_URL = `${BRAIN_URL}/mcp`;
const CLIENT_NAME = "MDCrypt Keeper"; // commits show up as "mdcrypt-keeper (brain-mcp)"

// Tools that never change the vault; shared sessions only get these (the owner's brain, read-only)
const READ_ONLY_TOOLS = new Set([
  "search_notes",
  "read_note",
  "list_folder",
  "get_links",
  "list_tags",
  "list_tasks",
  "recent_changes",
  "vault_guide",
  "vault_health",
  "view_image",
]);
// ChatGPT deep-research duplicates of search_notes/read_note
const HIDDEN_TOOLS = new Set(["search", "fetch"]);

/** The stored connection no longer works (refresh token expired or revoked); the user must reconnect. */
export class BrainDisconnectedError extends Error {}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

/** Where the brain server sends users back to: this app's own origin, so their session cookie is there. */
export function callbackUrl(requestUrl: string): string {
  return new URL("/api/brain/callback", requestUrl).toString();
}

/** Dynamic client registration: a public client (PKCE, no secret) for this app's callback URL. */
export async function registerClient(redirectUri: string): Promise<string> {
  const res = await fetch(`${BRAIN_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: CLIENT_NAME,
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });
  if (!res.ok) throw new Error(`Client registration failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { client_id: string }).client_id;
}

export function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function authorizeUrl(clientId: string, redirectUri: string, state: string, challenge: string): string {
  const url = new URL(`${BRAIN_URL}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("resource", MCP_URL);
  return url.toString();
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${BRAIN_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, resource: MCP_URL }),
  });
  const body = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string; error_description?: string };
  if (!res.ok || !body.access_token) {
    const err = new Error(body.error_description ?? body.error ?? `Token request failed: ${res.status}`);
    (err as Error & { oauthError?: string }).oauthError = body.error;
    throw err;
  }
  return body;
}

export function exchangeCode(clientId: string, redirectUri: string, code: string, verifier: string) {
  return tokenRequest({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  });
}

/** Who a token belongs to: their GitHub login and vault repo. */
export async function fetchUserinfo(accessToken: string): Promise<{ login: string; repo: string }> {
  const res = await fetch(`${BRAIN_URL}/userinfo`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`userinfo failed: ${res.status}`);
  return (await res.json()) as { login: string; repo: string };
}

const expiry = (t: TokenResponse) => new Date(Date.now() + (t.expires_in ?? 3600) * 1000);

export async function saveConnection(
  userId: string,
  clientId: string,
  tokens: TokenResponse,
  info: { login: string; repo: string }
) {
  await db
    .update(users)
    .set({
      brainClientId: clientId,
      brainAccessToken: encrypt(tokens.access_token),
      brainRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      brainExpiresAt: expiry(tokens),
      brainLogin: info.login,
      brainRepo: info.repo,
    })
    .where(eq(users.id, userId));
}

export async function disconnect(userId: string) {
  await db
    .update(users)
    .set({
      brainAccessToken: null,
      brainRefreshToken: null,
      brainExpiresAt: null,
      brainLogin: null,
      brainRepo: null,
    })
    .where(eq(users.id, userId));
}

async function loadConnection(userId: string) {
  const [row] = await db
    .select({
      clientId: users.brainClientId,
      accessToken: users.brainAccessToken,
      refreshToken: users.brainRefreshToken,
      expiresAt: users.brainExpiresAt,
      login: users.brainLogin,
      repo: users.brainRepo,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.accessToken ? row : null;
}

export async function getStatus(userId: string) {
  const conn = await loadConnection(userId);
  return conn ? { connected: true, login: conn.login, repo: conn.repo } : { connected: false };
}

/**
 * A valid access token for the user, refreshing it if it's about to expire.
 * Returns null if they never connected. Refresh tokens rotate on every use, so when two requests
 * refresh at once the loser's refresh fails; it then picks up the winner's tokens from the database.
 */
async function getAccessToken(userId: string): Promise<string | null> {
  const conn = await loadConnection(userId);
  if (!conn) return null;
  if (conn.expiresAt && conn.expiresAt.getTime() > Date.now() + 60_000) return decrypt(conn.accessToken!);
  if (!conn.refreshToken || !conn.clientId) throw new BrainDisconnectedError("Second brain session expired");

  try {
    const tokens = await tokenRequest({
      grant_type: "refresh_token",
      client_id: conn.clientId,
      refresh_token: decrypt(conn.refreshToken),
    });
    await db
      .update(users)
      .set({
        brainAccessToken: encrypt(tokens.access_token),
        brainRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : conn.refreshToken,
        brainExpiresAt: expiry(tokens),
      })
      .where(and(eq(users.id, userId), eq(users.brainRefreshToken, conn.refreshToken)));
    return tokens.access_token;
  } catch (err) {
    if ((err as { oauthError?: string }).oauthError !== "invalid_grant") throw err;
    // Another request may have just rotated the refresh token; give it a moment to save
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 700));
      const latest = await loadConnection(userId);
      if (latest && latest.refreshToken !== conn.refreshToken) return decrypt(latest.accessToken!);
    }
    await disconnect(userId);
    throw new BrainDisconnectedError("Second brain session expired or was revoked");
  }
}

/**
 * The user's second brain as AI SDK tools, or null if they haven't connected it.
 * readOnly limits it to tools that can't change the vault (used for shared sessions).
 */
export async function getBrainTools(userId: string, { readOnly }: { readOnly: boolean }) {
  const token = await getAccessToken(userId);
  if (!token) return null;
  const client = await createMCPClient({
    transport: { type: "http", url: MCP_URL, headers: { Authorization: `Bearer ${token}` } },
  });
  try {
    const all = await client.tools();
    const tools = Object.fromEntries(
      Object.entries(all).filter(([name]) => !HIDDEN_TOOLS.has(name) && (!readOnly || READ_ONLY_TOOLS.has(name)))
    ) as typeof all;
    return { tools, close: () => client.close() };
  } catch (err) {
    await client.close();
    throw err;
  }
}
