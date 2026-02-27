import crypto from 'crypto';
import type { CookieOptions, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { Pool } from 'pg';

type Tier = 'free' | 'library' | 'pro';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  tier: Tier;
};

type SessionLookupRow = {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  tier: Tier;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  tier: Tier;
};

type GoogleIdTokenResponse = {
  id_token?: string;
  error?: string;
  error_description?: string;
};

const DATABASE_URL = process.env.DATABASE_URL;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'sf_session';
export const OAUTH_STATE_COOKIE_NAME = 'sf_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
const IS_PROD = process.env.NODE_ENV === 'production';
const SAME_SITE_RAW = (process.env.SESSION_COOKIE_SAME_SITE || 'lax').toLowerCase();
const SESSION_COOKIE_SAME_SITE: 'lax' | 'strict' | 'none' =
  SAME_SITE_RAW === 'strict' || SAME_SITE_RAW === 'none' ? SAME_SITE_RAW : 'lax';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required for auth');
}
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are required for auth');
}

const useSsl = !/localhost|127\.0\.0\.1/i.test(DATABASE_URL);
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});
const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

let initPromise: Promise<void> | null = null;

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: SESSION_COOKIE_SAME_SITE,
    path: '/',
    domain: COOKIE_DOMAIN,
  };
}

export function setSessionCookie(res: Response, sessionToken: string) {
  // Clear host-only and domain cookies first to prevent duplicate sf_session cookies.
  clearSessionCookie(res);
  res.cookie(SESSION_COOKIE_NAME, sessionToken, {
    ...baseCookieOptions(),
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  const options = baseCookieOptions();
  res.clearCookie(SESSION_COOKIE_NAME, options);
  // Also clear host-only variant in case COOKIE_DOMAIN changed between deploys.
  if (options.domain) {
    res.clearCookie(SESSION_COOKIE_NAME, {
      ...options,
      domain: undefined,
    });
  }
}

export function setOAuthStateCookie(res: Response, state: string) {
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    ...baseCookieOptions(),
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS * 1000,
  });
}

export function clearOAuthStateCookie(res: Response) {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    ...baseCookieOptions(),
  });
}

export function getFrontendOrigin(): string {
  return FRONTEND_ORIGIN;
}

function parseCookieTokens(cookieHeader: string | undefined, name: string): string[] {
  if (!cookieHeader) return [];
  const tokens: string[] = [];
  const needle = `${name}=`;

  for (const chunk of cookieHeader.split(';')) {
    const part = chunk.trim();
    if (!part.startsWith(needle)) continue;
    const rawValue = part.slice(needle.length);
    if (!rawValue) continue;
    try {
      tokens.push(decodeURIComponent(rawValue));
    } catch {
      tokens.push(rawValue);
    }
  }

  return tokens;
}

export function getSessionTokensFromRequest(req: Request): string[] {
  const tokens = parseCookieTokens(req.headers.cookie, SESSION_COOKIE_NAME);
  const parserValue = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof parserValue === 'string' && parserValue.trim()) {
    tokens.push(parserValue);
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const token of tokens) {
    const value = token.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    unique.push(value);
  }

  return unique;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeState(): string {
  return crypto.randomBytes(24).toString('base64url');
}

function makeSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export async function initAuthStore(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        avatar TEXT,
        google_sub TEXT UNIQUE,
        tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'library', 'pro')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION set_users_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
      CREATE TRIGGER trg_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION set_users_updated_at();
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id
      ON sessions (user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires
      ON sessions (expires_at);
    `);
  })();

  return initPromise;
}

export function buildGoogleAuthStart(): { state: string; url: string } {
  const state = makeState();
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');
  return { state, url: authUrl.toString() };
}

async function exchangeCodeForIdentity(code: string): Promise<{
  email: string;
  name: string | null;
  avatar: string | null;
  googleSub: string;
}> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = (await tokenRes.json()) as GoogleIdTokenResponse;
  if (!tokenRes.ok || !tokenData.id_token) {
    const error = tokenData.error_description || tokenData.error || `Google token exchange failed (${tokenRes.status})`;
    throw new Error(error);
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken: tokenData.id_token,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) {
    throw new Error('Google account did not provide required identity fields');
  }
  if (payload.email_verified === false) {
    throw new Error('Google email is not verified');
  }

  return {
    email: payload.email.toLowerCase(),
    name: payload.name || null,
    avatar: payload.picture || null,
    googleSub: payload.sub,
  };
}

async function upsertUserFromGoogleIdentity(identity: {
  email: string;
  name: string | null;
  avatar: string | null;
  googleSub: string;
}): Promise<AuthUser> {
  const result = await pool.query<UserRow>(
    `
      INSERT INTO users (email, name, avatar, google_sub)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE
      SET
        name = COALESCE(EXCLUDED.name, users.name),
        avatar = COALESCE(EXCLUDED.avatar, users.avatar),
        google_sub = COALESCE(EXCLUDED.google_sub, users.google_sub)
      RETURNING id, email, name, avatar, tier
    `,
    [identity.email, identity.name, identity.avatar, identity.googleSub],
  );

  return result.rows[0];
}

async function createSessionForUser(userId: string): Promise<string> {
  const sessionToken = makeSessionToken();
  const tokenHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await pool.query(
    `
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt.toISOString()],
  );

  return sessionToken;
}

export async function signInWithGoogleAuthCode(code: string): Promise<{ user: AuthUser; sessionToken: string }> {
  await initAuthStore();
  const identity = await exchangeCodeForIdentity(code);
  const user = await upsertUserFromGoogleIdentity(identity);
  const sessionToken = await createSessionForUser(user.id);
  return { user, sessionToken };
}

export async function getUserFromSessionToken(sessionToken: string): Promise<AuthUser | null> {
  await initAuthStore();

  if (!sessionToken) return null;
  const tokenHash = hashToken(sessionToken);

  const result = await pool.query<SessionLookupRow>(
    `
      SELECT u.id, u.email, u.name, u.avatar, u.tier
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash],
  );

  return result.rows[0] ?? null;
}

export async function revokeSessionToken(sessionToken: string): Promise<void> {
  await initAuthStore();
  if (!sessionToken) return;

  const tokenHash = hashToken(sessionToken);
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}
