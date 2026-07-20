import { IpcMainInvokeEvent } from 'electron';
import { handle } from './authorize.js';
import * as fs from 'fs';
import * as path from 'path';
import { prisma, disconnectPrisma, getDbFilePath } from '../db.js';
import { writeAudit } from '../audit.js';
import { runBackup, verifyDatabaseFile } from '../backup-util.js';
import { initBackupScheduler } from '../cron.js';
import type { Session } from '../session.js';

export function registerBackupIpc() {
  // ─── List Backups logs ───────────────────────────────────────────────────
  handle('backup:list', async () => {
    try {
      const logs = await prisma.backup.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: logs };
    } catch {
      return { success: false, error: 'Failed to fetch backup logs.' };
    }
  });

  // ─── Trigger Database Backup (.db file copy) ──────────────────────────────
  // Manual, on-demand backup. Shares the WAL-checkpoint + integrity-verify
  // routine with the auto scheduler via runBackup().
  handle('backup:create', async (_event: IpcMainInvokeEvent, backupDir: string, session: Session | null) => {
    const result = await runBackup({ type: 'MANUAL', backupDir });
    if (!result.ok) {
      return { success: false, error: result.error ?? 'Database backup process failed.' };
    }
    await writeAudit(session, 'CREATE', 'Backup', result.log!.id);
    return { success: true, data: result.log };
  });

  // ─── Reschedule Auto-Backup ───────────────────────────────────────────────
  // Called by the renderer after saving backup settings so a changed frequency
  // / enabled toggle / retention takes effect immediately (no app restart).
  handle('backup:reschedule', async () => {
    try {
      await initBackupScheduler();
      return { success: true };
    } catch (error) {
      console.error('[backup:reschedule] Error:', error);
      return { success: false, error: 'Failed to reschedule auto-backup.' };
    }
  });

  // ─── Restore Database ─────────────────────────────────────────────────────
  handle('backup:restore', async (_event: IpcMainInvokeEvent, backupFilePath: string, session: Session | null) => {
    try {
      if (!backupFilePath || typeof backupFilePath !== 'string' || !fs.existsSync(backupFilePath)) {
        return { success: false, error: 'Backup file path does not exist.' };
      }

      const dbPath = getDbFilePath();
      if (path.resolve(backupFilePath) === dbPath) {
        return { success: false, error: 'Cannot restore a database over itself.' };
      }

      // Refuse to overwrite the live DB with a file that isn't a valid,
      // uncorrupted SQLite database.
      const sourceOk = await verifyDatabaseFile(backupFilePath);
      if (!sourceOk) {
        return { success: false, error: 'Selected backup failed integrity check; restore aborted.' };
      }

      // Snapshot the current DB before overwriting so a bad backup file
      // does not cause irreversible data loss.
      if (fs.existsSync(dbPath)) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        try {
          fs.copyFileSync(dbPath, `${dbPath}.pre-restore-${stamp}`);
        } catch (snapErr) {
          console.error('[backup:restore] Pre-restore snapshot failed:', snapErr);
          return { success: false, error: 'Could not snapshot current database; restore aborted.' };
        }
      }

      // Release the SQLite handle before overwriting the file on disk.
      await disconnectPrisma();

      // Overwrite database file
      fs.copyFileSync(backupFilePath, dbPath);

      // Delete the OLD database's WAL/SHM sidecars. In WAL mode SQLite replays a
      // leftover `-wal` on next open; without removing them the previous
      // database's uncheckpointed writes get replayed ON TOP of the freshly
      // restored file, silently reverting/corrupting the restore.
      for (const sidecar of [`${dbPath}-wal`, `${dbPath}-shm`]) {
        try {
          if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
        } catch (sideErr) {
          console.error(`[backup:restore] Failed to remove sidecar ${sidecar}:`, sideErr);
        }
      }

      // Prisma cannot safely reuse the swapped file mid-session; the app must
      // restart to reconnect to the restored database.
      await writeAudit(session, 'RESTORE', 'Backup', null);
      return { success: true, data: { restartRequired: true } };
    } catch (error) {
      console.error('[backup:restore] Error:', error);
      return { success: false, error: 'Database restore process failed.' };
    }
  });
}
