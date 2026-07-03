import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export function registerBackupIpc() {
  // ─── List Backups logs ───────────────────────────────────────────────────
  ipcMain.handle('backup:list', async () => {
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
  ipcMain.handle('backup:create', async (_event: IpcMainInvokeEvent, backupDir: string) => {
    try {
      const dbPath = path.join(process.cwd(), 'prisma/dev.db');
      if (!fs.existsSync(dbPath)) {
        return { success: false, error: 'Source SQLite database not found.' };
      }

      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `sugam_hms_backup_${timestamp}.db`;
      const destPath = path.join(backupDir, backupFileName);

      // Copy SQLite file safely
      fs.copyFileSync(dbPath, destPath);

      // Calculate size
      const stats = fs.statSync(destPath);
      const sizeBytes = stats.size;

      // Log in DB table
      const log = await prisma.backup.create({
        data: {
          filePath: destPath,
          size: sizeBytes,
          type: 'MANUAL',
          status: 'SUCCESS',
        },
      });

      return { success: true, data: log };
    } catch (error) {
      console.error('[backup:create] Error:', error);
      return { success: false, error: 'Database backup process failed.' };
    }
  });

  // ─── Restore Database ─────────────────────────────────────────────────────
  ipcMain.handle('backup:restore', async (_event: IpcMainInvokeEvent, backupFilePath: string) => {
    try {
      if (!fs.existsSync(backupFilePath)) {
        return { success: false, error: 'Backup file path does not exist.' };
      }

      const dbPath = path.join(process.cwd(), 'prisma/dev.db');

      // Close Prisma client connection before overwriting SQLite file
      await prisma.$disconnect();

      // Overwrite database file
      fs.copyFileSync(backupFilePath, dbPath);

      return { success: true };
    } catch (error) {
      console.error('[backup:restore] Error:', error);
      return { success: false, error: 'Database restore process failed.' };
    }
  });
}
