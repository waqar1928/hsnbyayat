import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// storage.ts reads UPLOAD_DIR from process.cwd() at import time (and reads
// PERSISTENT_UPLOADS_DIR at call time), so each test that needs a specific
// cwd/env combination isolates it: chdir into a fresh temp project root,
// re-import storage.ts fresh (Node caches modules by resolved path, and
// since UPLOAD_DIR is computed once at import time, a fresh import per cwd
// avoids tests contaminating each other's UPLOAD_DIR).
async function freshStorageModule() {
  const modUrl = `../src/lib/storage.ts?t=${Date.now()}-${Math.random()}`;
  return import(modUrl);
}

function makeTempProjectRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "storage-test-"));
  fs.mkdirSync(path.join(root, "public", "uploads"), { recursive: true });
  return root;
}

test("saveLocal (via saveUpload) writes only to public/uploads when PERSISTENT_UPLOADS_DIR is unset", async () => {
  const root = makeTempProjectRoot();
  const prevCwd = process.cwd();
  const prevPersistent = process.env.PERSISTENT_UPLOADS_DIR;
  const prevDriver = process.env.STORAGE_DRIVER;
  delete process.env.PERSISTENT_UPLOADS_DIR;
  delete process.env.STORAGE_DRIVER;
  process.chdir(root);
  try {
    const { saveUpload } = await freshStorageModule();
    const result = await saveUpload(Buffer.from("hello"), "photo.jpg", "image/jpeg");

    assert.equal(fs.existsSync(path.join(root, "public", "uploads", result.key)), true);
    assert.equal(fs.readFileSync(path.join(root, "public", "uploads", result.key), "utf-8"), "hello");
  } finally {
    process.chdir(prevCwd);
    if (prevPersistent !== undefined) process.env.PERSISTENT_UPLOADS_DIR = prevPersistent;
    if (prevDriver !== undefined) process.env.STORAGE_DRIVER = prevDriver;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("saveLocal (via saveUpload) writes to BOTH public/uploads and PERSISTENT_UPLOADS_DIR when set", async () => {
  const root = makeTempProjectRoot();
  const persistentDir = fs.mkdtempSync(path.join(os.tmpdir(), "persistent-"));
  const prevCwd = process.cwd();
  const prevPersistent = process.env.PERSISTENT_UPLOADS_DIR;
  const prevDriver = process.env.STORAGE_DRIVER;
  process.env.PERSISTENT_UPLOADS_DIR = persistentDir;
  delete process.env.STORAGE_DRIVER;
  process.chdir(root);
  try {
    const { saveUpload } = await freshStorageModule();
    const result = await saveUpload(Buffer.from("dual-write"), "photo.png", "image/png");

    const inUploads = path.join(root, "public", "uploads", result.key);
    const inPersistent = path.join(persistentDir, result.key);
    assert.equal(fs.existsSync(inUploads), true, "should be written to public/uploads");
    assert.equal(fs.existsSync(inPersistent), true, "should be mirrored to PERSISTENT_UPLOADS_DIR");
    assert.equal(fs.readFileSync(inUploads, "utf-8"), "dual-write");
    assert.equal(fs.readFileSync(inPersistent, "utf-8"), "dual-write");
  } finally {
    process.chdir(prevCwd);
    if (prevPersistent !== undefined) process.env.PERSISTENT_UPLOADS_DIR = prevPersistent;
    else delete process.env.PERSISTENT_UPLOADS_DIR;
    if (prevDriver !== undefined) process.env.STORAGE_DRIVER = prevDriver;
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(persistentDir, { recursive: true, force: true });
  }
});

test("deleteLocal (via deleteUpload) removes the file from BOTH locations when PERSISTENT_UPLOADS_DIR is set", async () => {
  const root = makeTempProjectRoot();
  const persistentDir = fs.mkdtempSync(path.join(os.tmpdir(), "persistent-"));
  const prevCwd = process.cwd();
  const prevPersistent = process.env.PERSISTENT_UPLOADS_DIR;
  const prevDriver = process.env.STORAGE_DRIVER;
  process.env.PERSISTENT_UPLOADS_DIR = persistentDir;
  delete process.env.STORAGE_DRIVER;
  process.chdir(root);
  try {
    const { saveUpload, deleteUpload } = await freshStorageModule();
    const result = await saveUpload(Buffer.from("to-delete"), "photo.jpg", "image/jpeg");
    const inUploads = path.join(root, "public", "uploads", result.key);
    const inPersistent = path.join(persistentDir, result.key);
    assert.equal(fs.existsSync(inUploads), true);
    assert.equal(fs.existsSync(inPersistent), true);

    await deleteUpload(result.key);

    assert.equal(fs.existsSync(inUploads), false, "should be removed from public/uploads");
    assert.equal(fs.existsSync(inPersistent), false, "should be removed from PERSISTENT_UPLOADS_DIR too");
  } finally {
    process.chdir(prevCwd);
    if (prevPersistent !== undefined) process.env.PERSISTENT_UPLOADS_DIR = prevPersistent;
    else delete process.env.PERSISTENT_UPLOADS_DIR;
    if (prevDriver !== undefined) process.env.STORAGE_DRIVER = prevDriver;
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(persistentDir, { recursive: true, force: true });
  }
});

test("deleting a nonexistent key does not throw, even with PERSISTENT_UPLOADS_DIR set", async () => {
  const root = makeTempProjectRoot();
  const persistentDir = fs.mkdtempSync(path.join(os.tmpdir(), "persistent-"));
  const prevCwd = process.cwd();
  const prevPersistent = process.env.PERSISTENT_UPLOADS_DIR;
  const prevDriver = process.env.STORAGE_DRIVER;
  process.env.PERSISTENT_UPLOADS_DIR = persistentDir;
  delete process.env.STORAGE_DRIVER;
  process.chdir(root);
  try {
    const { deleteUpload } = await freshStorageModule();
    await assert.doesNotReject(() => deleteUpload("never-existed.jpg"));
  } finally {
    process.chdir(prevCwd);
    if (prevPersistent !== undefined) process.env.PERSISTENT_UPLOADS_DIR = prevPersistent;
    else delete process.env.PERSISTENT_UPLOADS_DIR;
    if (prevDriver !== undefined) process.env.STORAGE_DRIVER = prevDriver;
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(persistentDir, { recursive: true, force: true });
  }
});
