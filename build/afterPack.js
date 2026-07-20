// electron-builder afterPack hook.
//
// WHY: `node_modules/.prisma` is a GENERATED dotfolder, not a declared
// dependency. electron-builder's production-dependency walker and dotfile
// handling can silently drop it, so `require('.prisma/client/default')` (done
// by @prisma/client/default.js at runtime) throws:
//     Error: Cannot find module '.prisma/client/default'
//
// The `files`/`asarUnpack` entries in electron-builder.json are the primary
// fix. This hook is a deterministic BACKSTOP: after the app dir is written, it
// verifies the generated Prisma client physically exists in
// `app.asar.unpacked/node_modules/.prisma/client`, and if any file is missing
// it copies it verbatim from the project's node_modules. Verbatim copy is not
// subject to dependency pruning or dotfile filtering, so this cannot be skipped.
//
// It runs before the asar is finalized enough that the unpacked tree is on
// disk; the asar index already carries the stubs from `files`, so the JS
// `require` resolves and the native engine loads from the unpacked copy.

const fs = require('fs');
const path = require('path');

/** Recursively copy a directory (Node 16 fs.cpSync fallback for older). */
function copyDir(src, dest) {
  if (typeof fs.cpSync === 'function') {
    fs.cpSync(src, dest, { recursive: true, force: true });
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

exports.default = async function afterPack(context) {
  const { appOutDir, packager } = context;
  const projectDir = packager.projectDir;

  // Windows: resources live at <appOutDir>/resources. (macOS differs, but this
  // is a Windows-only product.)
  const unpackedModules = path.join(
    appOutDir,
    'resources',
    'app.asar.unpacked',
    'node_modules'
  );

  const sources = [
    path.join(projectDir, 'node_modules', '.prisma'),
    path.join(projectDir, 'node_modules', '@prisma', 'client'),
  ];
  const dests = [
    path.join(unpackedModules, '.prisma'),
    path.join(unpackedModules, '@prisma', 'client'),
  ];

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const dest = dests[i];
    if (!fs.existsSync(src)) {
      console.warn(`[afterPack] source missing (run "prisma generate"?): ${src}`);
      continue;
    }
    // Copy if the destination is absent OR the key query-engine file is missing.
    const engineOk =
      fs.existsSync(dest) &&
      fs
        .readdirSync(dest)
        .some((f) => f.endsWith('.node') || f === 'default.js');
    if (!engineOk) {
      console.log(`[afterPack] restoring Prisma client -> ${dest}`);
      copyDir(src, dest);
    }
  }

  // Hard assertion: fail the build loudly if the crash-causing file is absent,
  // rather than shipping a broken installer.
  const mustExist = path.join(unpackedModules, '.prisma', 'client', 'default.js');
  if (!fs.existsSync(mustExist)) {
    throw new Error(
      `[afterPack] FATAL: ${mustExist} missing after pack. ` +
        `Packaged app would crash with "Cannot find module '.prisma/client/default'". ` +
        `Ensure "prisma generate" ran before the build.`
    );
  }
  console.log('[afterPack] Prisma client verified in app.asar.unpacked ✓');
};
