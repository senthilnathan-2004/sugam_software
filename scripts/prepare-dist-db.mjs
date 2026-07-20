/**
 * Builds a CLEAN, freshly-seeded SQLite database for packaging.
 *
 * WHY: the installer must NOT ship the developer's working `prisma/dev.db`,
 * which accumulates real patient PHI + test invoices. This script produces a
 * throwaway `prisma/dist.db` containing only the schema and the default seed
 * (hospital settings + the 4 first-login accounts) — no patient data — and
 * electron-builder ships THAT file (see electron-builder.json extraResources).
 *
 * Run automatically before every packaging command. Never commit dist.db
 * (covered by *.db in .gitignore).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dbFile = path.resolve('prisma', 'dist.db');

// Start from a clean slate — remove any prior dist DB + its WAL/SHM sidecars.
for (const f of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
  try {
    fs.rmSync(f, { force: true });
  } catch {
    /* ignore */
  }
}

// Absolute file: URL (forward slashes) so Prisma resolves it unambiguously
// regardless of cwd / schema directory.
const env = {
  ...process.env,
  DATABASE_URL: `file:${dbFile.replace(/\\/g, '/')}`,
};

console.log('[prepare-dist-db] Creating clean seeded DB at', dbFile);
execSync('npx prisma migrate deploy', { stdio: 'inherit', env });
// Invoke the seed via ts-node directly rather than `prisma db seed`: the prisma
// CLI reloads .env and does not reliably forward our overridden DATABASE_URL to
// the seed child, so it would target the dev DB (or fail to open dist.db).
execSync('npx ts-node --compiler-options "{\\"module\\":\\"CommonJS\\"}" prisma/seed.ts', {
  stdio: 'inherit',
  env,
});
console.log('[prepare-dist-db] Done — dist.db contains schema + defaults only (no patient data).');
