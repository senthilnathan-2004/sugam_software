import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { prisma } from './db.js';

/**
 * Offline migration runner — the packaged app's equivalent of `prisma migrate deploy`.
 *
 * WHY THIS EXISTS
 * ---------------
 * `electron/env.ts` copies the seeded `dev.db` into userData only ON FIRST RUN.
 * It never touches an existing user database again. So when the app ships a new
 * schema (new column/table/index via a Prisma migration), an ALREADY-INSTALLED
 * copy keeps its old database — and the freshly-generated Prisma client then
 * queries columns the old DB doesn't have, throwing `P2022: column ... does not
 * exist` on every affected handler (e.g. adding a patient writes a Notification
 * row with the new `priority`/`category` columns → fails → "can't add patient").
 *
 * We can't ship the full `prisma` CLI + migration engine into an offline desktop
 * app cheaply, but our migrations are plain SQLite DDL. This runner does exactly
 * what `migrate deploy` does for SQLite: read the applied set from
 * `_prisma_migrations`, then apply every bundled migration that isn't recorded
 * yet, each inside one transaction, recording it on success. A hospital's
 * accumulated data is preserved — the DB is upgraded in place, never replaced.
 *
 * It is idempotent: a fresh install's seeded DB already records all migrations,
 * so this is a no-op there.
 */

function migrationsDir(): string {
  if (app.isPackaged) {
    // Shipped via electron-builder `extraResources`.
    return path.join(process.resourcesPath, 'prisma', 'migrations');
  }
  // Dev: __dirname === <project>/electron/dist/electron at runtime.
  return path.join(__dirname, '..', '..', '..', 'prisma', 'migrations');
}

/**
 * Split a Prisma migration.sql into individual statements. Prisma migrations are
 * DDL-only (no `;` inside string literals), so stripping comments and splitting
 * on `;` is safe and matches how the migration engine streams them.
 */
function splitStatements(sql: string): string[] {
  const withoutBlockComments = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutLineComments = withoutBlockComments
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join('\n');
  return withoutLineComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function appliedMigrationNames(): Promise<Set<string>> {
  // Prisma's bookkeeping table. `CREATE IF NOT EXISTS` keeps this safe on the
  // (unexpected) chance the DB predates Prisma's migration tracking.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    );
  `);
  const rows = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`
  );
  return new Set(rows.map((r) => r.migration_name));
}

/**
 * Apply every bundled migration not yet recorded in the target database.
 * Throws if a migration fails (caller shows a fatal dialog rather than letting
 * the app run against a half-migrated schema).
 */
export async function applyPendingMigrations(): Promise<void> {
  const dir = migrationsDir();
  if (!fs.existsSync(dir)) {
    console.warn(`[migrate] migrations directory not found: ${dir} — skipping`);
    return;
  }

  const applied = await appliedMigrationNames();

  const names = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(dir, name, 'migration.sql')))
    .sort(); // migration folders are timestamp-prefixed → lexical == chronological

  const pending = names.filter((n) => !applied.has(n));
  if (pending.length === 0) {
    console.log('[migrate] database is up to date');
    return;
  }

  console.log(`[migrate] applying ${pending.length} pending migration(s): ${pending.join(', ')}`);

  for (const name of pending) {
    const sql = fs.readFileSync(path.join(dir, name, 'migration.sql'), 'utf8');
    const statements = splitStatements(sql);
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const ops = statements.map((stmt) => prisma.$executeRawUnsafe(stmt));
    // Record success in the same transaction so a crash mid-migration rolls the
    // whole thing back and it is retried cleanly on next launch.
    ops.push(
      prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations"
           ("id","checksum","finished_at","migration_name","started_at","applied_steps_count")
         VALUES (?,?,?,?,?,?)`,
        id,
        checksum,
        now,
        name,
        now,
        statements.length
      )
    );

    await prisma.$transaction(ops);
    console.log(`[migrate] applied ${name} (${statements.length} statements)`);
  }
}
