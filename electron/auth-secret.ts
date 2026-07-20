import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Resolves the JWT signing secret for the main process.
 *
 * Previously the secret was a hardcoded literal
 * (`'sugam-hms-secret-dev-key-change-in-production'`) shipped in every build,
 * so anyone with the source could forge a valid admin token. Now:
 *   1. Honour `JWT_SECRET` from the environment if set (ops override).
 *   2. Otherwise generate a cryptographically-random secret once and persist it
 *      under the OS user-data dir, so tokens survive restarts but the key is
 *      unique per installation and never present in the source tree.
 *
 * Called lazily (inside IPC handlers, after `app` is ready) so `getPath`
 * resolves correctly.
 */
let cached: string | null = null;

export function getJwtSecret(): string {
  if (cached) return cached;

  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 16) {
    cached = envSecret;
    return cached;
  }

  try {
    const secretPath = path.join(app.getPath('userData'), '.jwt-secret');
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) {
        cached = existing;
        return cached;
      }
    }
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    cached = generated;
    return cached;
  } catch (err) {
    // Filesystem unavailable: fall back to an ephemeral secret. Tokens won't
    // survive a restart, but they are still unforgeable this session.
    console.error('[auth-secret] Could not persist JWT secret, using ephemeral key:', err);
    cached = crypto.randomBytes(48).toString('hex');
    return cached;
  }
}
