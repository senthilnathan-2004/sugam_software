import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

/**
 * Minimal, dependency-free local file logger for the main process.
 *
 * A hospital IT person needs to be able to send a log file when "it doesn't
 * work". We deliberately DON'T pull in electron-log or winston: adding a
 * dependency means a network install, and this product's whole premise is
 * offline. This writes to a rotating file under the OS userData dir and routes
 * the existing `console.*` calls through it, so no call sites had to change.
 */

const MAX_BYTES = 5 * 1024 * 1024; // rotate once past 5 MB
let logFile: string | null = null;

function resolveLogFile(): string {
  if (logFile) return logFile;
  const dir = path.join(app.getPath('userData'), 'logs');
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
  logFile = path.join(dir, 'main.log');
  return logFile;
}

function rotateIfNeeded(file: string): void {
  try {
    if (fs.statSync(file).size > MAX_BYTES) {
      fs.renameSync(file, `${file}.1`); // keep one previous log
    }
  } catch {
    /* file may not exist yet */
  }
}

function format(level: string, args: unknown[]): string {
  const ts = new Date().toISOString();
  const msg = args
    .map((a) => (typeof a === 'string' ? a : util.inspect(a, { depth: 4 })))
    .join(' ');
  return `${ts} [${level}] ${msg}\n`;
}

function append(level: string, args: unknown[]): void {
  try {
    const file = resolveLogFile();
    rotateIfNeeded(file);
    fs.appendFileSync(file, format(level, args));
  } catch {
    /* logging must never throw */
  }
}

/**
 * Wraps console.* so output goes to BOTH the terminal (dev) and the log file.
 * Idempotent-ish: only call once, at startup.
 */
export function initLogger(): void {
  const orig = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  console.log = (...a: unknown[]) => {
    orig.log(...a);
    append('INFO', a);
  };
  console.info = (...a: unknown[]) => {
    orig.info(...a);
    append('INFO', a);
  };
  console.warn = (...a: unknown[]) => {
    orig.warn(...a);
    append('WARN', a);
  };
  console.error = (...a: unknown[]) => {
    orig.error(...a);
    append('ERROR', a);
  };

  let version = 'unknown';
  try {
    version = app.getVersion();
  } catch {
    /* ignore */
  }
  append('INFO', [`──────── Sugam HMS main process started (v${version}) ────────`]);
}

export function getLogFilePath(): string {
  return resolveLogFile();
}
