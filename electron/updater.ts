import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';

export function initUpdater(mainWindow: BrowserWindow) {
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
