import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow } from 'electron';

export function initUpdater(mainWindow: BrowserWindow) {
  // This is an offline-first product. Never check for updates in dev (there is
  // no app-update.yml, which would just log errors), and when packaged an
  // offline machine or an unreachable feed must degrade to a silent no-op
  // rather than error/crash. The checkForUpdates promise below is fully
  // guarded, so a missing feed / no network simply does nothing.
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('updater:status', 'Checking for update...');
  });

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('updater:status', 'Update available. Downloading...');
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('updater:status', 'Update not available.');
  });

  autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('updater:status', `Error: ${err.message}`);
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('updater:status', 'Update downloaded. Ready to install.');
    // In production this prompts user to restart and install
    autoUpdater.quitAndInstall();
  });

  // Check for updates background trigger
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('[updater:check] Failed to check for updates:', err);
  });
}
