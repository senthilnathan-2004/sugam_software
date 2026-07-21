// MUST be first: provisions DATABASE_URL / query engine before any IPC module
// instantiates PrismaClient at import time.
import './env.js';

import { app, BrowserWindow, dialog } from 'electron';
import * as path from 'path';
import { initLogger } from './logger.js';
// Removed electron-is-dev import to prevent ERR_REQUIRE_ESM in CJS main process

import { registerAppScheme, serveApp, APP_URL } from './staticServe.js';
import { initDatabasePragmas } from './db.js';
import { applyPendingMigrations } from './migrate.js';
import { getMode } from './deployment.js';

// IPC Registries
import { registerAuthIpc } from './ipc/auth.ipc.js';
import { registerDashboardIpc } from './ipc/dashboard.ipc.js';
import { registerPatientIpc } from './ipc/patient.ipc.js';
import { registerDoctorIpc } from './ipc/doctor.ipc.js';
import { registerInventoryIpc } from './ipc/inventory.ipc.js';
import { registerBillingIpc } from './ipc/billing.ipc.js';
import { registerReportsIpc } from './ipc/reports.ipc.js';
import { registerSettingsIpc } from './ipc/settings.ipc.js';
import { registerBackupIpc } from './ipc/backup.ipc.js';
import { registerNotificationIPC } from './ipc/notification.ipc.js';
import { registerDeploymentIpc } from './ipc/deployment.ipc.js';
import { registerLanIpc } from './ipc/lan.ipc.js';

// Core Integrations
import { initBackupScheduler } from './cron.js';
import { initTray } from './tray.js';
import { initProtocol } from './protocol.js';
import { initUpdater } from './updater.js';

// LAN transport (offline multi-PC)
import { startLanServer, stopLanServer, getConnectedDevices } from './lan/server.js';
import { startConnectionManager, stopConnectionManager } from './lan/connection.js';
import { getConfig } from './deployment.js';

let mainWindow: BrowserWindow | null = null;

// Route console.* to a local rotating log file (before anything else logs).
initLogger();

// Last-resort safety net: log the fault and show a graceful dialog instead of
// letting the process die silently (or, for a rejection, leak).
process.on('uncaughtException', (err: Error) => {
  console.error('[uncaughtException]', err);
  try {
    dialog.showErrorBox(
      'Sugam HMS — Unexpected Error',
      'Something went wrong. Please restart the application.\n\n' + (err?.message ?? String(err))
    );
  } catch {
    /* dialog may be unavailable very early; already logged */
  }
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[unhandledRejection]', reason);
});

// Custom `app://` scheme must be registered as privileged before `ready`.
registerAppScheme();

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

  app.on('ready', async () => {
    const mode = getMode();

    // DATABASE OWNERSHIP (spec §23): only STANDALONE/HOST own the authoritative
    // DB. A CLIENT owns no operational database — it must not run migrations,
    // seed, or open a local clinic DB; it forwards every request to the Host.
    // So the migration gate runs for STANDALONE/HOST only.
    if (mode !== 'CLIENT') {
      // Bring the (possibly pre-existing) user database up to the current schema
      // BEFORE the renderer loads and starts issuing queries. Skipping this lets
      // a stale DB throw `P2022: column ... does not exist` on every handler that
      // touches a newly-added column. Pragmas first so the migration runs on a
      // WAL connection with foreign keys enforced.
      try {
        await initDatabasePragmas();
        await applyPendingMigrations();
      } catch (err) {
        console.error('[startup] Database migration failed:', err);
        dialog.showErrorBox(
          'Sugam HMS — Database Update Failed',
          'The application could not update its database to the latest version and ' +
            'cannot start safely.\n\nPlease contact support with the log file at:\n' +
            path.join(app.getPath('userData'), 'logs', 'main.log') +
            '\n\n' +
            (err instanceof Error ? err.message : String(err))
        );
        app.quit();
        return;
      }
    } else {
      console.log('[startup] CLIENT mode: skipping local DB init/migrations (Host owns the database).');
    }

    createWindow();

    // LAN wiring (HOST starts the server; CLIENT starts the connection manager)
    // is initialized here after the window exists. Added in Phase C/D.
    await initLanForMode(mode);
  });
}

function createWindow() {
  // Normally dev (unpackaged) loads the Next dev server at localhost:3000.
  // HMS_SERVE_STATIC=1 forces the packaged-style path — serving the prebuilt
  // `out/` over app:// — while still unpackaged. Useful for running the app
  // without the Next compiler (e.g. on machines where dev/build is too
  // memory-heavy). Requires `out/` to exist (npm run next:build).
  const isDev = !app.isPackaged && process.env.HMS_SERVE_STATIC !== '1';
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
    icon: path.join(__dirname, '../../public/logo.png'),
  });

  // Mirror the renderer's console (including uncaught errors) into the main
  // log file. A checkout that fails CLIENT-SIDE (a thrown exception, a failed
  // fetch) otherwise leaves no trace in main.log — this makes such failures
  // visible in the one file support asks users to send.
  mainWindow.webContents.on(
    'console-message',
    (_e, level: number, message: string, line: number, sourceId: string) => {
      const tag = level >= 3 ? 'RENDER-ERR' : level === 2 ? 'RENDER-WARN' : 'RENDER';
      const where = sourceId ? ` (${String(sourceId).split('/').pop()}:${line})` : '';
      console.log(`[${tag}] ${message}${where}`);
    }
  );

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    serveApp();
    mainWindow.loadURL(APP_URL);
  }

  // Initialize System Tray, Deep Links, Updates, and Cron Backups
  initTray(mainWindow);
  initProtocol(mainWindow);
  initUpdater(mainWindow);
  // DATABASE OWNERSHIP (spec §23/§24): only STANDALONE/HOST own the DB and its
  // backups. A CLIENT must never run scheduled/independent backups against its
  // (non-operational) local placeholder DB.
  if (getMode() !== 'CLIENT') {
    initBackupScheduler();
  }

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
  // Local-only LAN/deployment channels (never forwarded; usable pre-login).
  registerDeploymentIpc();
  registerLanIpc();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize LAN transport for the current deployment mode.
 *   - HOST: start the LAN HTTP server so Doctor clients can share this DB.
 *   - CLIENT: start the Host connection manager (health polling for the status UI).
 *   - STANDALONE: nothing — byte-for-byte the original single-PC behavior.
 */
async function initLanForMode(mode: ReturnType<typeof getMode>): Promise<void> {
  if (mode === 'HOST') {
    try {
      await startLanServer(getConfig().port);
    } catch (err) {
      // A bind failure (e.g. port in use, blocked by firewall) must not kill the
      // Host's own local UI — surface it and keep the app usable locally.
      const message = err instanceof Error ? err.message : String(err);
      console.error('[startup] LAN server failed to start:', message);
      dialog.showErrorBox(
        'Sugam HMS — Network Server Not Started',
        'This computer is set as the Main/Host, but the clinic network server could not start:\n\n' +
          message +
          '\n\nOther computers will not be able to connect until this is resolved (check that the ' +
          'port is free and allowed through Windows Firewall for Private networks). Sugam HMS will ' +
          'continue to work on this computer.'
      );
    }
  } else if (mode === 'CLIENT') {
    startConnectionManager();
  }
}

// Warn before shutting down a Host that still has clients connected (spec §21),
// then stop LAN services cleanly. `allowQuit` prevents an infinite prompt loop.
let allowQuit = false;
app.on('before-quit', (event) => {
  if (!allowQuit && getMode() === 'HOST') {
    const devices = getConnectedDevices();
    if (devices.length > 0) {
      const choice = dialog.showMessageBoxSync({
        type: 'warning',
        buttons: ['Cancel', 'Exit Anyway'],
        defaultId: 0,
        cancelId: 0,
        title: 'Clinic devices are connected',
        message: `${devices.length} clinic device(s) are currently connected.`,
        detail:
          'Closing Sugam HMS on this Main computer will disconnect:\n- ' +
          devices.map((d) => d.name).join('\n- ') +
          '\n\nThose computers will not be able to use Sugam HMS until this one is running again.',
      });
      if (choice === 0) {
        event.preventDefault();
        return;
      }
    }
  }
  allowQuit = true;
  stopConnectionManager();
  void stopLanServer();
});

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
