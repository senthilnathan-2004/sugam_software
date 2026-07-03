import { app, BrowserWindow } from 'electron';
import * as path from 'path';
// Removed electron-is-dev import to prevent ERR_REQUIRE_ESM in CJS main process

// IPC Registries
import { registerAuthIpc } from './ipc/auth.ipc';
import { registerDashboardIpc } from './ipc/dashboard.ipc';
import { registerPatientIpc } from './ipc/patient.ipc';
import { registerDoctorIpc } from './ipc/doctor.ipc';
import { registerInventoryIpc } from './ipc/inventory.ipc';
import { registerBillingIpc } from './ipc/billing.ipc';
import { registerReportsIpc } from './ipc/reports.ipc';
import { registerSettingsIpc } from './ipc/settings.ipc';
import { registerBackupIpc } from './ipc/backup.ipc';
import { registerNotificationIPC } from './ipc/notification.ipc';

// Core Integrations
import { initBackupScheduler } from './cron';
import { initTray } from './tray';
import { initProtocol } from './protocol';
import { initUpdater } from './updater';

let mainWindow: BrowserWindow | null = null;
const isSingleInstance = app.requestSingleInstanceLock();

if (!isSingleInstance) {
  app.quit();
} else {
  // Register deep link second-instance listeners
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('ready', () => {
    createWindow();
  });
}

function createWindow() {
  const isDev = !app.isPackaged;
  if (isDev) {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1366,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Sugam HMS',
    backgroundColor: '#F8FAFC',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../out/index.html'));
  }

  // Initialize System Tray, Deep Links, Updates, and Cron Backups
  initTray(mainWindow);
  initProtocol(mainWindow);
  initUpdater(mainWindow);
  initBackupScheduler();

  // Register all IPC modules
  registerAuthIpc();
  registerDashboardIpc();
  registerPatientIpc();
  registerDoctorIpc();
  registerInventoryIpc();
  registerBillingIpc();
  registerReportsIpc();
  registerSettingsIpc();
  registerBackupIpc();
  registerNotificationIPC();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
