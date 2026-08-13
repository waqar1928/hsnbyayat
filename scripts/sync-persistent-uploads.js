// Runs as part of `postinstall`, on every single deploy — see package.json —
// which means it always runs BEFORE `next build`.
//
// Why this exists: on hosts whose deploy pipeline builds into a fresh
// directory each time (confirmed on Hostinger's Git-based Node.js App
// deploys — each deploy gets its own `hbuilds/versions/<id>/nodejs`
// checkout), `public/uploads` starts empty on every deploy, since actual
// uploaded files are correctly gitignored (they're runtime data, not
// source). Locally-stored uploads (STORAGE_DRIVER=local, the default — see
// src/lib/storage.ts) therefore silently vanish the next time any code
// change gets deployed, even though the database still references them —
// confirmed in production: an admin-uploaded logo 404'd after a later,
// unrelated deploy.
//
// This is the deploy-time half of the fix: copy whatever's already in
// PERSISTENT_UPLOADS_DIR (a fixed path outside the versioned build tree,
// set once via that env var) into the fresh `public/uploads` before the
// build runs. The other half — new uploads also getting written straight
// to PERSISTENT_UPLOADS_DIR so they're there for the *next* deploy's copy
// — lives in src/lib/storage.ts's saveLocal/deleteLocal.
//
// Deliberately a plain copy, not a symlink (an earlier version of this
// fix used one): Next.js's build-time file tracer/bundler refuses to
// follow a symlink that points outside the project root ("Symlink ...
// points out of the filesystem root"), which broke the production build
// outright the moment a deploy finally got far enough to reach that step.
// A real, ordinary `public/uploads` directory has no such problem.
const fs = require("fs");
const path = require("path");

/**
 * Copies every file from `persistentDir` into `uploadsDir`, creating
 * `uploadsDir` first if it doesn't exist (as a plain directory — if
 * something else is there, like a leftover symlink from the old approach,
 * it's replaced with a real directory). Never touches `persistentDir`'s
 * contents. Safe to call repeatedly: skips a file if the destination
 * already exists with the same size (cheap, sufficient — these are
 * immutable, randomly-named uploads; nothing legitimately overwrites an
 * existing key in place).
 *
 * @returns a summary object, useful for logging and for tests.
 */
function syncPersistentUploads(uploadsDir, persistentDir) {
  if (!persistentDir) {
    return { skipped: true, reason: "PERSISTENT_UPLOADS_DIR not set", copied: [], uploadsDir, persistentDir: null };
  }

  const uploadsStat = fs.existsSync(uploadsDir) ? fs.lstatSync(uploadsDir) : null;
  if (uploadsStat?.isSymbolicLink()) {
    // Migrating away from an earlier symlink-based version of this fix —
    // remove the link (leaves the real files in persistentDir untouched,
    // a symlink has no content of its own) so a real directory can take
    // its place below.
    fs.unlinkSync(uploadsDir);
  }
  fs.mkdirSync(uploadsDir, { recursive: true });

  if (!fs.existsSync(persistentDir)) {
    // Nothing persisted yet (e.g. very first deploy after wiring this up)
    // — not an error, just nothing to copy.
    return { skipped: false, reason: "persistentDir does not exist yet", copied: [], uploadsDir, persistentDir };
  }

  const copied = [];
  for (const entry of fs.readdirSync(persistentDir)) {
    if (entry === ".gitkeep") continue;
    const from = path.join(persistentDir, entry);
    const to = path.join(uploadsDir, entry);
    if (!fs.statSync(from).isFile()) continue; // uploads are always flat files, skip anything unexpected

    const alreadyPresent = fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size;
    if (alreadyPresent) continue;

    fs.copyFileSync(from, to);
    copied.push(entry);
  }

  return { skipped: false, copied, uploadsDir, persistentDir };
}

function main() {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const persistentDir = process.env.PERSISTENT_UPLOADS_DIR || null;
  const result = syncPersistentUploads(uploadsDir, persistentDir);

  if (result.skipped) {
    console.log(`${result.reason} — skipping (fine for local dev / hosts with a stable filesystem).`);
    return;
  }
  console.log(`public/uploads ready as a real directory at ${result.uploadsDir}.`);
  if (result.reason) {
    console.log(result.reason);
  } else {
    console.log(`Copied ${result.copied.length} file(s) from ${result.persistentDir}: ${result.copied.join(", ") || "(none new)"}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { syncPersistentUploads };
