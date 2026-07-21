import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getMode } from './deployment.js';

/**
 * Provisions the Prisma runtime environment for the Electron main process.
 *
 * The main process does NOT load `.env`, and in a packaged build the seeded
 * SQLite database ships read-only inside `resources`. This module (imported
 * first, before any IPC module instantiates PrismaClient) guarantees:
 *   - DATABASE_URL points at a writable database
 *   - Prisma can locate its native query engine (unpacked from the asar)
 *
 * CLIENT mode (spec §23): a client PC owns NO operational database — it forwards
 * every request to the Host. It must never open, migrate, seed, or fall back to
 * a local clinic DB. We therefore point DATABASE_URL at a NON-OPERATIONAL
 * placeholder path that is never migrated, seeded, or queried (all queries are
 * forwarded), purely so `new PrismaClient()` at import time cannot throw for a
 * missing env var. The query-engine path is still set in packaged builds so
 * construction has the native library available even though it is never used.
 */

// Resolve the packaged query-engine path once (used by HOST/STANDALONE, and set
// harmlessly for CLIENT so construction never fails).
function setPackagedEnginePath(resourcesPath: string): void {
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
}

if (getMode() === 'CLIENT') {
  // Non-operational placeholder: never created unless queried, and the client
  // never queries locally. NOT named dev.db, never migrated, never seeded.
  const placeholder = path.join(app.getPath('userData'), 'client-no-local-db.placeholder');
  process.env.DATABASE_URL = `file:${placeholder}`;
  if (app.isPackaged) {
    setPackagedEnginePath(process.resourcesPath);
  }
} else if (app.isPackaged) {
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
  setPackagedEnginePath(resourcesPath);
} else if (!process.env.DATABASE_URL) {
  // Dev: use the seeded database in the project's prisma directory.
  // __dirname === <project>/electron/dist/electron at runtime.
  const devDb = path.join(__dirname, '..', '..', '..', 'prisma', 'dev.db');
  process.env.DATABASE_URL = `file:${devDb}`;
}
