import { app, Tray, Menu, BrowserWindow } from 'electron';
import * as path from 'path';

let tray: Tray | null = null;

export function initTray(mainWindow: BrowserWindow) {
  try {
    // Basic placeholder asset setup: in production Windows installers this will load public/icons/icon.ico
    const iconPath = path.join(__dirname, '../../public/next.svg'); 
    tray = new Tray(iconPath);

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
