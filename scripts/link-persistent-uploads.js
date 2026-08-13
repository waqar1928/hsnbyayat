// Runs as part of `postinstall`, on every single deploy — see package.json.
//
// Why this exists: on hosts whose deploy pipeline builds into a fresh
// directory each time (confirmed on Hostinger's Git-based Node.js App
// deploys — each deploy gets its own `hbuilds/versions/<id>/nodejs`
// checkout), `public/uploads` starts empty on every deploy, since actual
// uploaded files are correctly gitignored (they're runtime data, not
// source). Locally-stored uploads (STORAGE_DRIVER=local, the default —
// see src/lib/storage.ts) therefore silently vanish the next time any code
// change gets deployed, even though the database still references them —
// confirmed in production: an admin-uploaded logo 404'd after a later,
// unrelated deploy, while more recently uploaded product photos (uploaded
// after that deploy, so still present in the *current* version's folder)
// worked fine.
//
// Fix: point `public/uploads` at a directory OUTSIDE the versioned build
// tree, set once via the PERSISTENT_UPLOADS_DIR env var (e.g.
// /home/<user>/domains/<domain>/persistent-uploads), so every deploy's
// `public/uploads` resolves to the exact same real files on disk. Hosts
// that don't need this (local dev, Docker/VPS with one stable directory,
// Vercel/S3-backed deployments) simply don't set the env var, and this
// script no-ops.
const fs = require("fs");
const path = require("path");

const persistentDir = process.env.PERSISTENT_UPLOADS_DIR;
if (!persistentDir) {
  console.log("PERSISTENT_UPLOADS_DIR not set — skipping (fine for local dev / hosts with a stable filesystem).");
  process.exit(0);
}

const uploadsPath = path.join(process.cwd(), "public", "uploads");

fs.mkdirSync(persistentDir, { recursive: true });

const stat = fs.lstatSync(uploadsPath, { throwIfNoEntry: false });

if (stat?.isSymbolicLink()) {
  const currentTarget = fs.readlinkSync(uploadsPath);
  if (path.resolve(path.dirname(uploadsPath), currentTarget) === path.resolve(persistentDir)) {
    console.log(`public/uploads already links to ${persistentDir} — nothing to do.`);
    process.exit(0);
  }
  // Points somewhere unexpected (shouldn't normally happen) — remove and
  // recreate correctly below rather than leaving a stale/wrong link.
  fs.unlinkSync(uploadsPath);
} else if (stat?.isDirectory()) {
  // A real directory (first run, or a host where this hasn't been wired up
  // before) — move its contents into the persistent dir so nothing already
  // uploaded gets lost, then remove the now-empty directory.
  for (const entry of fs.readdirSync(uploadsPath)) {
    if (entry === ".gitkeep") continue;
    const from = path.join(uploadsPath, entry);
    const to = path.join(persistentDir, entry);
    if (!fs.existsSync(to)) fs.renameSync(from, to);
  }
  fs.rmSync(uploadsPath, { recursive: true, force: true });
}

fs.symlinkSync(persistentDir, uploadsPath, "dir");
console.log(`Linked public/uploads -> ${persistentDir}`);
