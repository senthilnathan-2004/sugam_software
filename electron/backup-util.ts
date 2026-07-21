import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { prisma, getDbFilePath } from './db.js';
import { getMode } from './deployment.js';

/**
 * Shared backup routine used by BOTH the manual IPC trigger (backup:create) and
 * the automatic scheduler (cron). Keeping one implementation guarantees auto
 * backups get the same WAL-checkpoint + integrity-verify safety the manual path
 * had — previously the scheduled path did a raw file copy with neither, so an
 * auto backup could be torn/stale or silently corrupt.
 */

/**
 * Opens a .db file with a short-lived, isolated client and runs
 * `PRAGMA integrity_check`. Returns true only if SQLite reports "ok".
 */
export async function verifyDatabaseFile(filePath: string): Promise<boolean> {
  // Use the EXACT URL form the app's working main client uses (env.ts sets
  // DATABASE_URL = 'file:' + <native path>). Converting to forward slashes here
  // produced `file:C:/...`, which Prisma's SQLite connector failed to open on
  // Windows (SQLITE_CANTOPEN / "Error code 14") — so every verify, and thus every
  // scheduled backup, was silently discarded. `connection_limit=1` keeps this a
  // single short-lived handle that releases the file promptly.
  const url = `file:${path.resolve(filePath)}?connection_limit=1`;
  const checkClient = new PrismaClient({ datasources: { db: { url } } });
  try {
    const rows = await checkClient.$queryRawUnsafe<Array<Record<string, unknown>>>(
      'PRAGMA integrity_check'
    );
    const first = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    const result = first ? String(Object.values(first)[0]).toLowerCase() : '';
    return result === 'ok';
  } catch (err) {
    console.error('[backup:verify] integrity_check failed:', err);
    return false;
  } finally {
    await checkClient.$disconnect().catch(() => {});
  }
}

/** Resolve a caller-supplied backup dir, falling back to a per-user writable path. */
export function resolveBackupDir(dir?: string | null): string {
  if (dir && typeof dir === 'string' && dir.trim()) return dir.trim();
  return path.join(app.getPath('userData'), 'backups');
}

export interface RunBackupResult {
  ok: boolean;
  error?: string;
  log?: { id: string; filePath: string; size: number; type: string; status: string };
}

/**
 * Checkpoint the WAL, copy the live SQLite file, verify the copy, and record a
 * Backup row. On integrity failure the bad file is deleted and a FAILED row is
 * logged. Never throws — always returns a result envelope.
 */
export async function runBackup(opts: {
  type: 'MANUAL' | 'AUTO';
  backupDir?: string | null;
}): Promise<RunBackupResult> {
  const { type } = opts;
  try {
    // A Client owns no operational database — it must never back one up.
    if (getMode() === 'CLIENT') {
      return { ok: false, error: 'Backups run on the Main/Host computer only.' };
    }
    const dbPath = getDbFilePath();
    if (!fs.existsSync(dbPath)) {
      return { ok: false, error: 'Source SQLite database not found.' };
    }

    const backupDir = resolveBackupDir(opts.backupDir);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Flush WAL into the main .db so the hot copy is internally consistent.
    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL)');
    } catch (cpErr) {
      console.error('[backup] WAL checkpoint failed:', cpErr);
      return { ok: false, error: 'Could not checkpoint database before backup.' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = type === 'AUTO' ? 'sugam_hms_auto_backup' : 'sugam_hms_backup';
    const destPath = path.join(backupDir, `${prefix}_${timestamp}.db`);

    fs.copyFileSync(dbPath, destPath);

    // Verify the copy opens and passes integrity_check before recording it.
    const okFile = await verifyDatabaseFile(destPath);
    if (!okFile) {
      try {
        fs.unlinkSync(destPath);
      } catch {
        /* ignore */
      }
      await prisma.backup.create({
        data: { filePath: destPath, size: 0, type, status: 'FAILED' },
      });
      return { ok: false, error: 'Backup failed integrity check and was discarded.' };
    }

    const stats = fs.statSync(destPath);
    const log = await prisma.backup.create({
      data: { filePath: destPath, size: stats.size, type, status: 'SUCCESS' },
    });

    return { ok: true, log };
  } catch (error) {
    console.error('[backup] runBackup error:', error);
    return { ok: false, error: 'Database backup process failed.' };
  }
}
