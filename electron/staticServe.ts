import { protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Serves the statically-exported Next.js app (the `out/` directory) over a
 * custom `app://` scheme. This is required because Next emits absolute asset
 * paths (`/_next/...`) that break under `file://`, and because a standard
 * secure scheme gives the renderer a proper origin for client-side routing.
 */

const SCHEME = 'app';

// Content-Security-Policy for the packaged renderer. Locks all resource loads
// to the app's own origin (no remote scripts, no remote exfiltration via
// connect/img). 'unsafe-inline' is retained for script/style because the Next
// static export relies on inline bootstrap/theme styles; tightening to nonces
// is a future hardening step.
const CSP = [
  "default-src 'self' app:",
  "script-src 'self' app: 'unsafe-inline'",
  "style-src 'self' app: 'unsafe-inline'",
  "img-src 'self' app: data: blob:",
  "font-src 'self' app: data:",
  "connect-src 'self' app:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain',
};

// Must be called BEFORE app `ready`.
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
    },
  ]);
}

let handlerRegistered = false;

// Must be called AFTER app `ready`.
export function serveApp(): void {
  if (handlerRegistered) return;
  handlerRegistered = true;

  // Compiled to <root>/electron/dist/electron/staticServe.js; the exported
  // site lives at <root>/out (project root === three levels up).
  const outDir = path.join(__dirname, '..', '..', '..', 'out');

  protocol.handle(SCHEME, async (request) => {
    let pathname = decodeURIComponent(new URL(request.url).pathname);
    if (pathname === '/' || pathname === '') pathname = '/index.html';

    let filePath = path.normalize(path.join(outDir, pathname));

    // Prevent path traversal outside outDir. Compare against `outDir + sep` so a
    // sibling like `<parent>/out-evil` cannot satisfy a bare `startsWith(outDir)`.
    const normalizedOut = path.normalize(outDir);
    if (filePath !== normalizedOut && !filePath.startsWith(normalizedOut + path.sep)) {
      return new Response('Forbidden', { status: 403 });
    }

    // Resolve the file to actually serve. Next's static export emits a ROUTE
    // like `/billing` as the FILE `out/billing.html`, while ALSO creating an
    // `out/billing/` DIRECTORY for nested routes (`/billing/invoices`). The old
    // logic joined `out` + `/billing`, found the directory existed, then tried
    // to `readFile` it → EISDIR → 500, so navigating to `/billing` broke the
    // page (React never hydrated → dead buttons). Correct order for an
    // extensionless request: prefer `<path>.html`, then `<path>/index.html`,
    // else SPA-fallback to index.html. Never attempt to read a directory.
    const hasExt = !!path.extname(pathname) && pathname !== '/index.html';
    if (hasExt) {
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return new Response('Not found', { status: 404 });
      }
    } else {
      const htmlSibling = filePath.replace(/[\\/]$/, '') + '.html';
      const dirIndex = path.join(filePath, 'index.html');
      if (fs.existsSync(htmlSibling) && fs.statSync(htmlSibling).isFile()) {
        filePath = htmlSibling;
      } else if (fs.existsSync(dirIndex) && fs.statSync(dirIndex).isFile()) {
        filePath = dirIndex;
      } else if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        // extensionless real file (rare) — serve as-is
      } else {
        // Unknown route or a directory without its own .html — let the client
        // router take over from index.html.
        filePath = path.join(outDir, 'index.html');
      }
    }

    try {
      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      return new Response(new Uint8Array(data), {
        headers: {
          'content-type': MIME[ext] ?? 'application/octet-stream',
          'Content-Security-Policy': CSP,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (err) {
      console.error('[staticServe] Failed to read', filePath, err);
      return new Response('Internal error', { status: 500 });
    }
  });
}

export const APP_URL = `${SCHEME}://local/`;
