import { app, BrowserWindow } from 'electron';
import * as path from 'path';

/**
 * Configures deep link URL scheme protocols for windows integration.
 * Triggers on custom URL schemes e.g. "sugamhms://"
 */
export function initProtocol(mainWindow: BrowserWindow) {
  // Set app as default protocol client
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('sugamhms', process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient('sugamhms');
  }

  // Handle second instances deep link calls on Windows
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();

      // Find deep link argument
      const deepLink = commandLine.find((arg) => arg.startsWith('sugamhms://'));
      if (deepLink) {
        console.log(`[protocol] Deep link triggered: ${deepLink}`);
        mainWindow.webContents.send('protocol:deep-link', deepLink);
      }
    }
  });
}
