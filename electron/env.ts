import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Provisions the Prisma runtime environment for the Electron main process.
 *
 * The main process does NOT load `.env`, and in a packaged build the seeded
 * SQLite database ships read-only inside `resources`. This module (imported
 * first, before any IPC module instantiates PrismaClient) guarantees:
 *   - DATABASE_URL points at a writable database
 *   - Prisma can locate its native query engine (unpacked from the asar)
 */

if (app.isPackaged) {
  const resourcesPath = process.resourcesPath;

  // Seed DB is copied into resources by electron-builder `extraResources`.
  const seededDb = path.join(resourcesPath, 'prisma', 'dev.db');
  const userDbPath = path.join(app.getPath('userData'), 'dev.db');

  try {
    if (!fs.existsSync(userDbPath) && fs.existsSync(seededDb)) {
      fs.copyFileSync(seededDb, userDbPath);
    }
  } catch (err) {
    console.error('[env] Failed to provision writable database:', err);
  }

  process.env.DATABASE_URL = `file:${userDbPath}`;

  // The query engine is a native addon and cannot be dlopen'd from inside the
  // asar, so it is asarUnpack'd; point Prisma directly at the unpacked copy.
  const enginePath = path.join(
    resourcesPath,
    'app.asar.unpacked',
    'node_modules',
    '.prisma',
    'client',
    'query_engine-windows.dll.node'
  );
  if (fs.existsSync(enginePath)) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
  }
} else if (!process.env.DATABASE_URL) {
  // Dev: use the seeded database in the project's prisma directory.
  // __dirname === <project>/electron/dist/electron at runtime.
  const devDb = path.join(__dirname, '..', '..', '..', 'prisma', 'dev.db');
  process.env.DATABASE_URL = `file:${devDb}`;
}
