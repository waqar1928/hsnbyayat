import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncPersistentUploads } from "../scripts/sync-persistent-uploads.js";

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("no-ops when persistentDir is not provided", () => {
  const uploadsDir = makeTempDir("uploads-");
  const result = syncPersistentUploads(uploadsDir, null);
  assert.equal(result.skipped, true);
});

test("creates uploadsDir if it doesn't exist yet, even with no persistentDir contents", () => {
  const root = makeTempDir("root-");
  const uploadsDir = path.join(root, "public", "uploads"); // deliberately not pre-created
  const persistentDir = makeTempDir("persistent-");

  const result = syncPersistentUploads(uploadsDir, persistentDir);

  assert.equal(result.skipped, false);
  assert.equal(fs.existsSync(uploadsDir), true);
  assert.equal(fs.lstatSync(uploadsDir).isDirectory(), true);
  assert.deepEqual(result.copied, []);
});

test("does not error when persistentDir does not exist yet (first deploy after wiring this up)", () => {
  const uploadsDir = makeTempDir("uploads-");
  const persistentDir = path.join(os.tmpdir(), "does-not-exist-" + Date.now());

  const result = syncPersistentUploads(uploadsDir, persistentDir);

  assert.equal(result.skipped, false);
  assert.equal(fs.existsSync(uploadsDir), true); // uploadsDir still ready
});

test("copies files from persistentDir into uploadsDir", () => {
  const uploadsDir = makeTempDir("uploads-");
  const persistentDir = makeTempDir("persistent-");
  fs.writeFileSync(path.join(persistentDir, "abc123.jpg"), "fake-image-bytes");
  fs.writeFileSync(path.join(persistentDir, ".gitkeep"), "");

  const result = syncPersistentUploads(uploadsDir, persistentDir);

  assert.deepEqual(result.copied, ["abc123.jpg"]);
  assert.equal(fs.readFileSync(path.join(uploadsDir, "abc123.jpg"), "utf-8"), "fake-image-bytes");
  // .gitkeep is not a real upload — should not be copied
  assert.equal(fs.existsSync(path.join(uploadsDir, ".gitkeep")), false);
});

test("never deletes or modifies files in persistentDir", () => {
  const uploadsDir = makeTempDir("uploads-");
  const persistentDir = makeTempDir("persistent-");
  fs.writeFileSync(path.join(persistentDir, "keep-me.jpg"), "original-content");

  syncPersistentUploads(uploadsDir, persistentDir);

  assert.equal(fs.existsSync(path.join(persistentDir, "keep-me.jpg")), true);
  assert.equal(fs.readFileSync(path.join(persistentDir, "keep-me.jpg"), "utf-8"), "original-content");
});

test("is idempotent — running twice does not error or duplicate work incorrectly", () => {
  const uploadsDir = makeTempDir("uploads-");
  const persistentDir = makeTempDir("persistent-");
  fs.writeFileSync(path.join(persistentDir, "one.jpg"), "content-one");

  const first = syncPersistentUploads(uploadsDir, persistentDir);
  const second = syncPersistentUploads(uploadsDir, persistentDir);

  assert.deepEqual(first.copied, ["one.jpg"]);
  assert.deepEqual(second.copied, []); // already present with matching size — skipped, not re-copied
  assert.equal(fs.readFileSync(path.join(uploadsDir, "one.jpg"), "utf-8"), "content-one");
});

test("replaces a symlinked uploadsDir with a real directory (migration from the old symlink approach)", () => {
  const root = makeTempDir("root-");
  const persistentDir = makeTempDir("persistent-");
  fs.writeFileSync(path.join(persistentDir, "migrated.jpg"), "migrated-content");

  const uploadsDir = path.join(root, "uploads");
  fs.symlinkSync(persistentDir, uploadsDir, "dir"); // simulate the old, now-removed symlink strategy

  const result = syncPersistentUploads(uploadsDir, persistentDir);

  assert.equal(fs.lstatSync(uploadsDir).isSymbolicLink(), false);
  assert.equal(fs.lstatSync(uploadsDir).isDirectory(), true);
  assert.deepEqual(result.copied, ["migrated.jpg"]);
});
