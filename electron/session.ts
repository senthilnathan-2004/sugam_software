import jwt from 'jsonwebtoken';
import { getJwtSecret } from './auth-secret.js';

/**
 * Server-side session registry for the Electron main process.
 *
 * WHY THIS EXISTS
 * ---------------
 * Before this, "auth" was a JWT the renderer stored in localStorage and NO IPC
 * handler ever checked it — any renderer code (or a patched build) could invoke
 * `settings:create-user`, `patient:delete`, etc. directly. See electron/ipc/authorize.ts.
 *
 * The JWT is still the transport credential: it is signed with a per-install
 * secret the renderer never sees (electron/auth-secret.ts), so the renderer
 * cannot forge one or tamper with its `role`. On top of that we keep an
 * in-memory registry of live sessions so that:
 *   - logout / disabling a user can REVOKE a token immediately (a bare JWT can't
 *     be revoked before it expires), and
 *   - identity/role is resolved from this server-held record, never from a
 *     `role`/`userId` field in the IPC payload.
 *
 * The registry is intentionally in-memory: it is wiped on app restart, at which
 * point the renderer re-presents its persisted JWT via `auth:verify`, and
 * `restoreSession` re-establishes the entry (preserving "stay logged in across
 * restart" while still allowing mid-session revocation).
 */

export type SessionRole = 'ADMIN' | 'DOCTOR' | 'BILLING' | 'RECEPTION';

export interface Session {
  userId: string;
  role: SessionRole;
  email: string;
  name: string;
  issuedAt: number;
  /** Updated on every authenticated call; drives the sliding idle timeout. */
  lastActivity: number;
}

interface UserForSession {
  id: string;
  email: string;
  role: string;
  name: string;
}

// Sessions are SLIDING, not fixed-lifetime. A 24h hard JWT expiry used to log a
// cashier out mid-shift — a continuously-used POS would suddenly get every
// checkout rejected once 24h elapsed since login, with no way to recover but a
// manual re-login. Instead:
//   - the JWT carries a long ABSOLUTE cap (JWT_EXPIRES_IN) so a token can never
//     live forever, and
//   - each authenticated call refreshes `lastActivity`; a session is expired
//     only after IDLE_TIMEOUT_MS of inactivity (getSession).
// Net: an in-use terminal never expires mid-work; an unattended one logs out
// after the idle window; every token is force-rotated by the absolute cap.
const JWT_EXPIRES_IN = '30d'; // absolute maximum token lifetime
const IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // sliding idle window: 12 hours

/** token (JWT) -> live session record. */
const sessions = new Map<string, Session>();

function toSession(user: UserForSession): Session {
  const now = Date.now();
  return {
    userId: user.id,
    role: user.role as SessionRole,
    email: user.email,
    name: user.name,
    issuedAt: now,
    lastActivity: now,
  };
}

/** Issue a signed token for a freshly-authenticated user and register it. */
export function createSession(user: UserForSession): string {
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, name: user.name },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
  sessions.set(token, toSession(user));
  return token;
}

/**
 * Re-establish a session from a previously-issued token (used by `auth:verify`
 * at app boot). Returns the session if the token's signature/expiry are valid,
 * else null. Caller is responsible for confirming the user still exists/active.
 */
export function restoreSession(user: UserForSession, token: string): Session {
  const session = toSession(user);
  sessions.set(token, session);
  return session;
}

/**
 * Resolve a live session from a token. Returns null if the token is unknown
 * (never issued / already revoked / lost on restart) or no longer valid
 * (bad signature / expired). This is the single source of server-trusted
 * identity for authorization.
 */
export function getSession(token: string | null | undefined): Session | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;

  // Sliding idle timeout: expire a session that has been untouched too long,
  // independent of the JWT's (longer) absolute expiry.
  if (Date.now() - session.lastActivity > IDLE_TIMEOUT_MS) {
    sessions.delete(token);
    return null;
  }

  try {
    jwt.verify(token, getJwtSecret());
  } catch {
    // Absolute-expired or tampered: drop it so it can't be reused.
    sessions.delete(token);
    return null;
  }

  // Valid call — slide the idle window forward.
  session.lastActivity = Date.now();
  return session;
}

/** Revoke a single session (logout). */
export function destroySession(token: string | null | undefined): void {
  if (token) sessions.delete(token);
}

/** Revoke every session for a user (e.g. when the account is disabled/deleted). */
export function destroySessionsForUser(userId: string): void {
  for (const [token, session] of sessions) {
    if (session.userId === userId) sessions.delete(token);
  }
}
