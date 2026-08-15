import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// storage.ts reads PERSISTENT_UPLOADS_DIR at call time (falling back to
// public/uploads under process.cwd() only when unset), so each test that
// needs a specific env/cwd combination isolates it: set env vars, chdir
// into a fresh temp project root if needed, and re-import storage.ts fresh
// via a cache-busting query string (Node caches modules by resolved path,
// and repeated imports of the exact same URL would return the same module
// instance).
async function freshStorageModule() {
  const modUrl = `../src/lib/storage.ts?t=${Date.now()}-${Math.random()}`;
  return import(modUrl);
}

async function withEnv<T>(overrides: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(overrides)) prev[k] = process.env[k];
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("saveUpload (local driver) writes to PERSISTENT_UPLOADS_DIR and returns an /api/uploads/ URL", async () => {
  const persistentDir = fs.mkdtempSync(path.join(os.tmpdir(), "persistent-"));
  try {
    await withEnv({ PERSISTENT_UPLOADS_DIR: persistentDir, STORAGE_DRIVER: undefined }, async () => {
      const { saveUpload } = await freshStorageModule();
      const result = await saveUpload(Buffer.from("hello"), "photo.jpg", "image/jpeg");

      assert.match(result.url, /^\/api\/uploads\/.+\.jpg$/);
      assert.equal(fs.existsSync(path.join(persistentDir, result.key)), true);
      assert.equal(fs.readFileSync(path.join(persistentDir, result.key), "utf-8"), "hello");
    });
  } finally {
    fs.rmSync(persistentDir, { recursive: true, force: true });
  }
});

test("falls back to public/uploads (under cwd) when PERSISTENT_UPLOADS_DIR is unset — local dev", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devroot-"));
  const prevCwd = process.cwd();
  process.chdir(root);
  try {
    await withEnv({ PERSISTENT_UPLOADS_DIR: undefined, STORAGE_DRIVER: undefined }, async () => {
      const { saveUpload } = await freshStorageModule();
      const result = await saveUpload(Buffer.from("dev-upload"), "photo.png", "image/png");

      const expectedPath = path.join(root, "public", "uploads", result.key);
      assert.equal(fs.existsSync(expectedPath), true);
      assert.equal(fs.readFileSync(expectedPath, "utf-8"), "dev-upload");
    });
  } finally {
    process.chdir(prevCwd);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("deleteUpload removes the file from PERSISTENT_UPLOADS_DIR", async () => {
  const persistentDir = fs.mkdtempSync(path.join(os.tmpdir(), "persistent-"));
  try {
    await withEnv({ PERSISTENT_UPLOADS_DIR: persistentDir, STORAGE_DRIVER: undefined }, async () => {
      const { saveUpload, deleteUpload } = await freshStorageModule();
      const result = await saveUpload(Buffer.from("to-delete"), "photo.jpg", "image/jpeg");
      assert.equal(fs.existsSync(path.join(persistentDir, result.key)), true);

      await deleteUpload(result.key);

      assert.equal(fs.existsSync(path.join(persistentDir, result.key)), false);
    });
  } finally {
    fs.rmSync(persistentDir, { recursive: true, force: true });
  }
});

test("deleting a nonexistent key does not throw", async () => {
  const persistentDir = fs.mkdtempSync(path.join(os.tmpdir(), "persistent-"));
  try {
    await withEnv({ PERSISTENT_UPLOADS_DIR: persistentDir, STORAGE_DRIVER: undefined }, async () => {
      const { deleteUpload } = await freshStorageModule();
      await assert.doesNotReject(() => deleteUpload("never-existed.jpg"));
    });
  } finally {
    fs.rmSync(persistentDir, { recursive: true, force: true });
  }
});

test("uploadExists reflects whether the file is actually on disk", async () => {
  const persistentDir = fs.mkdtempSync(path.join(os.tmpdir(), "persistent-"));
  try {
    await withEnv({ PERSISTENT_UPLOADS_DIR: persistentDir, STORAGE_DRIVER: undefined }, async () => {
      const { saveUpload, uploadExists } = await freshStorageModule();
      const result = await saveUpload(Buffer.from("exists"), "photo.jpg", "image/jpeg");

      assert.equal(await uploadExists(result.key), true);
      assert.equal(await uploadExists("does-not-exist.jpg"), false);
    });
  } finally {
    fs.rmSync(persistentDir, { recursive: true, force: true });
  }
});

test("isSafeKey accepts well-formed keys and rejects path-traversal / malformed input", async () => {
  const { isSafeKey } = await freshStorageModule();

  assert.equal(isSafeKey("a1b2c3d4-1234-4321-9999-abcdef012345.png"), true);
  assert.equal(isSafeKey("logo.jpg"), true);

  assert.equal(isSafeKey("../../etc/passwd"), false);
  assert.equal(isSafeKey("..%2f..%2fetc%2fpasswd"), false);
  assert.equal(isSafeKey("foo/bar.png"), false);
  assert.equal(isSafeKey("noext"), false);
  assert.equal(isSafeKey(".hidden.png"), false);
  assert.equal(isSafeKey(""), false);
});

test("uploadExists / readUploadStream refuse path-traversal keys even if the target file exists", async () => {
  const persistentDir = fs.mkdtempSync(path.join(os.tmpdir(), "persistent-"));
  // A real file just outside persistentDir, which a traversal key would target.
  const secretPath = path.join(path.dirname(persistentDir), "secret.txt");
  fs.writeFileSync(secretPath, "should never be servable");

  try {
    await withEnv({ PERSISTENT_UPLOADS_DIR: persistentDir, STORAGE_DRIVER: undefined }, async () => {
      const { uploadExists, readUploadStream } = await freshStorageModule();

      assert.equal(await uploadExists("../secret.txt"), false);
      assert.equal(await readUploadStream("../secret.txt"), null);
    });
  } finally {
    fs.rmSync(persistentDir, { recursive: true, force: true });
    fs.rmSync(secretPath, { force: true });
  }
});

test("readUploadStream returns a readable stream with the correct size for an existing file", async () => {
  const persistentDir = fs.mkdtempSync(path.join(os.tmpdir(), "persistent-"));
  try {
    await withEnv({ PERSISTENT_UPLOADS_DIR: persistentDir, STORAGE_DRIVER: undefined }, async () => {
      const { saveUpload, readUploadStream } = await freshStorageModule();
      const content = "stream-me-please";
      const result = await saveUpload(Buffer.from(content), "photo.jpg", "image/jpeg");

      const file = await readUploadStream(result.key);
      assert.ok(file);
      assert.equal(file!.size, Buffer.byteLength(content));

      const chunks: Uint8Array[] = [];
      for await (const chunk of file!.stream as unknown as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      assert.equal(Buffer.concat(chunks).toString("utf-8"), content);
    });
  } finally {
    fs.rmSync(persistentDir, { recursive: true, force: true });
  }
});

test("keyFromStoredUrl handles both the legacy /uploads/ and current /api/uploads/ URL formats", async () => {
  const { keyFromStoredUrl } = await freshStorageModule();

  assert.equal(keyFromStoredUrl("/uploads/abc-123.png"), "abc-123.png");
  assert.equal(keyFromStoredUrl("/api/uploads/abc-123.png"), "abc-123.png");
  assert.equal(keyFromStoredUrl("https://bucket.example.com/abc-123.png"), null);
  assert.equal(keyFromStoredUrl("/uploads/../../etc/passwd"), null);
});

test("getPublicUrl always produces the /api/uploads/ form", async () => {
  const { getPublicUrl } = await freshStorageModule();
  assert.equal(getPublicUrl("abc-123.png"), "/api/uploads/abc-123.png");
});
