import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
let backupTask: cron.ScheduledTask | null = null;

/**
 * Safely runs a SQLite file copy database backup.
 */
async function performScheduledBackup() {
  try {
    const settings = await prisma.appSetting.findMany();
    const config: Record<string, string> = {};
    settings.forEach((s: any) => {
      config[s.key] = s.value;
    });

    const backupDir = config.backup_dir || path.join(process.cwd(), 'backups');
    const retentionCount = parseInt(config.backup_retention || '10', 10);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dbPath = path.join(process.cwd(), 'prisma/dev.db');
    if (!fs.existsSync(dbPath)) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destPath = path.join(backupDir, `sugam_hms_auto_backup_${timestamp}.db`);

    // Perform copy
    fs.copyFileSync(dbPath, destPath);

    // Save log
    const stats = fs.statSync(destPath);
    await prisma.backup.create({
      data: {
        filePath: destPath,
        size: stats.size,
        type: 'AUTO',
        status: 'SUCCESS',
      },
    });

    // Handle retention limit: prune old auto backups
    const autoBackups = await prisma.backup.findMany({
      where: { type: 'AUTO', status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });

    if (autoBackups.length > retentionCount) {
      const toDelete = autoBackups.slice(retentionCount);
      for (const item of toDelete) {
        if (fs.existsSync(item.filePath)) {
          fs.unlinkSync(item.filePath);
        }
        await prisma.backup.delete({ where: { id: item.id } });
      }
    }
  } catch (error) {
    console.error('[cron:backup] Scheduled backup error:', error);
  }
}

/**
 * Initializes/reschedules the background auto-backup job based on DB settings.
 * Defaults to daily at midnight ('0 0 * * *').
 */
export async function initBackupScheduler() {
  try {
    if (backupTask) {
      backupTask.stop();
      backupTask = null;
    }

    const frequencySetting = await prisma.appSetting.findUnique({
      where: { key: 'backup_frequency' },
    });

    // Translate settings parameter to cron expression
    // DAILY: '0 0 * * *', WEEKLY: '0 0 * * 0', MONTHLY: '0 0 1 * *'
    let expression = '0 0 * * *'; // Default daily
    const freq = frequencySetting?.value || 'DAILY';

    if (freq === 'WEEKLY') expression = '0 0 * * 0';
    if (freq === 'MONTHLY') expression = '0 0 1 * *';

    backupTask = cron.schedule(expression, () => {
      console.log(`[cron:backup] Triggering scheduled database backup. Mode: ${freq}`);
      performScheduledBackup();
    });

    console.log(`[cron:backup] Auto-backup cron initialized successfully: ${expression}`);
  } catch (error) {
    console.error('[cron:init] Failed to initialize cron backup task:', error);
  }
}
