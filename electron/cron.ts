import * as cron from 'node-cron';
import * as fs from 'fs';
import { prisma } from './db.js';
import { runBackup, resolveBackupDir } from './backup-util.js';

let backupTask: cron.ScheduledTask | null = null;

// Frequency → cron expression + approximate interval (ms) used for startup
// catch-up. DAILY: midnight, WEEKLY: Sunday midnight, MONTHLY: 1st midnight.
const FREQUENCY = {
  DAILY: { cron: '0 0 * * *', intervalMs: 24 * 60 * 60 * 1000 },
  WEEKLY: { cron: '0 0 * * 0', intervalMs: 7 * 24 * 60 * 60 * 1000 },
  MONTHLY: { cron: '0 0 1 * *', intervalMs: 30 * 24 * 60 * 60 * 1000 },
} as const;

type Freq = keyof typeof FREQUENCY;

async function loadConfig(): Promise<Record<string, string>> {
  const settings = await prisma.appSetting.findMany();
  const config: Record<string, string> = {};
  settings.forEach((s: any) => {
    config[s.key] = s.value;
  });
  return config;
}

/**
 * Runs a scheduled backup (WAL-checkpointed, integrity-verified via the shared
 * runBackup helper) and prunes old AUTO backups past the retention limit.
 */
async function performScheduledBackup() {
  try {
    const config = await loadConfig();
    const backupDir = resolveBackupDir(config.backup_dir);
    const retentionCount = parseInt(config.backup_retention || '10', 10);

    const result = await runBackup({ type: 'AUTO', backupDir });
    if (!result.ok) {
      console.error('[cron:backup] Scheduled backup failed:', result.error);
      return;
    }

    // Retention: keep newest N successful AUTO backups, prune the rest.
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
 * Initializes/reschedules the background auto-backup job from DB settings.
 *
 * Called on app startup and again whenever the user saves backup settings
 * (via the backup:reschedule IPC) so cadence changes take effect without a
 * restart.
 *
 * Two safeguards for a desktop app that is NOT running 24/7:
 *  - Startup catch-up: if the last successful backup is older than the chosen
 *    interval (or none exists), run one immediately. A plain midnight cron
 *    never fires on days the clinic's machine was off at midnight.
 *  - Reschedule: any existing task is stopped before a new one is created.
 */
export async function initBackupScheduler() {
  try {
    if (backupTask) {
      backupTask.stop();
      backupTask = null;
    }

    const config = await loadConfig();

    // Enabled unless explicitly turned off. Missing key preserves prior
    // always-on behaviour for existing installs.
    if (config.backup_enabled === 'false') {
      console.log('[cron:backup] Auto-backup disabled by settings.');
      return;
    }

    const freq: Freq = (config.backup_frequency as Freq) in FREQUENCY
      ? (config.backup_frequency as Freq)
      : 'DAILY';
    const { cron: expression, intervalMs } = FREQUENCY[freq];

    // Startup catch-up.
    const lastSuccess = await prisma.backup.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });
    const overdue =
      !lastSuccess || Date.now() - new Date(lastSuccess.createdAt).getTime() >= intervalMs;
    if (overdue) {
      console.log('[cron:backup] Last backup is overdue — running startup catch-up backup.');
      await performScheduledBackup();
    }

    backupTask = cron.schedule(expression, () => {
      console.log(`[cron:backup] Triggering scheduled database backup. Mode: ${freq}`);
      performScheduledBackup();
    });

    console.log(`[cron:backup] Auto-backup scheduled: ${freq} (${expression}).`);
  } catch (error) {
    console.error('[cron:init] Failed to initialize cron backup task:', error);
  }
}
