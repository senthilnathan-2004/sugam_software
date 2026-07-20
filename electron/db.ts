import { PrismaClient } from '@prisma/client';
import * as path from 'path';

/**
 * Single shared PrismaClient for the entire Electron main process.
 *
 * Previously every IPC module created its own `new PrismaClient()` (~11 pools).
 * Against a single-writer SQLite file this multiplies connection handles and
 * causes `SQLITE_BUSY`/locking under concurrent writes, and made
 * `backup:restore`'s `$disconnect()` meaningless (it only closed one of them).
 *
 * NOTE: `./env` MUST be imported before this module so `DATABASE_URL` (and, in
 * packaged builds, the query-engine path) are provisioned before the client is
 * constructed. `electron/main.ts` imports `./env` on its first line.
 */
export const prisma = new PrismaClient();

/**
 * Applies connection/database PRAGMAs once at startup. Prisma does not set these
 * for SQLite, so without this the DB runs in rollback-journal mode with full
 * fsync on every write — slow, and it serialises readers against writers.
 *
 * - journal_mode=WAL: readers don't block the writer (and vice-versa). Persists.
 * - synchronous=NORMAL: safe under WAL, fsyncs only at checkpoints.
 * - cache_size=-16000: ~16 MB page cache per connection (negative = KiB).
 * - foreign_keys=ON: SQLite defaults this OFF; we rely on FK actions/cascades.
 * - busy_timeout=5000: wait on a briefly-locked DB instead of erroring.
 *
 * Uses $queryRawUnsafe for all (some PRAGMAs return a row, which
 * $executeRawUnsafe rejects).
 */
let pragmasApplied = false;
export async function initDatabasePragmas(): Promise<void> {
  if (pragmasApplied) return;
  pragmasApplied = true;
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    await prisma.$queryRawUnsafe('PRAGMA cache_size = -16000;');
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
  } catch (err) {
    console.error('[db] Failed to apply startup PRAGMAs:', err);
  }
}

// Ensure the SQLite handle is released cleanly on shutdown so file copies
// (backup/restore) and the OS don't see a locked database.
/**
 * Absolute path to the live SQLite file, derived from the same `DATABASE_URL`
 * Prisma actually uses (set by `./env`). Backup/restore/cron previously guessed
 * `path.join(process.cwd(), 'prisma/dev.db')`, which is WRONG in a packaged
 * build (cwd is not the app dir, and the writable DB lives under userData) — so
 * backups silently targeted a non-existent or stale file in production.
 */
export function getDbFilePath(): string {
  const url = process.env.DATABASE_URL ?? '';
  const raw = url.startsWith('file:') ? url.slice('file:'.length) : url;
  return path.resolve(raw);
}

let disconnected = false;
export async function disconnectPrisma(): Promise<void> {
  if (disconnected) return;
  disconnected = true;
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
}
