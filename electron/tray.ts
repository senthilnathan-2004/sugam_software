import { app, Tray, Menu, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let tray: Tray | null = null;

// Candidate tray icons in priority order. A .ico/.png is required — Windows
// Tray does not render SVG. Paths are resolved relative to the compiled file
// (<root>/electron/dist/electron) and to packaged resources.
function resolveTrayIcon(): string | null {
  const candidates = [
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.join(__dirname, '../../public/icon.ico'),
    path.join(__dirname, '../../public/icons/icon.ico'),
    path.join(__dirname, '../../public/favicon.ico'),
    path.join(process.resourcesPath || '', 'logo.png'),
    path.join(__dirname, '../../public/logo.png'),
  ];
  return candidates.find((p) => p && fs.existsSync(p)) ?? null;
}

export function initTray(mainWindow: BrowserWindow) {
  try {
    const iconPath = resolveTrayIcon();
    // Fall back to an empty native image so the tray + menu still work rather
    // than throwing (a real .ico should be added to the build for branding).
    const icon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
    if (!iconPath) {
      console.warn('[tray:init] No tray icon asset found; using blank icon.');
    }
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Sugam HMS',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        },
      },
      {
        label: 'Minimize to Tray',
        click: () => {
          mainWindow.hide();
        },
      },
      { type: 'separator' },
      {
        label: 'Exit Application',
        click: () => {
          app.quit();
        },
      },
    ]);

    tray.setToolTip('Sugam HMS');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      mainWindow.show();
      mainWindow.focus();
    });
  } catch (error) {
    console.error('[tray:init] System tray icon initialization failed:', error);
  }
}
