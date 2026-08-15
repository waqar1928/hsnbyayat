import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

// Storage abstraction: local disk (persistent-uploads dir) in production,
// or S3-compatible (Cloudflare R2, AWS S3, ...) when STORAGE_DRIVER=s3.
// Callers only ever see { url, key } — never a filesystem path.
//
// PERSISTENT_UPLOADS_DIR is the single source of truth for the local
// driver. It is NOT inside the project/build directory: Hostinger's
// Git-based deploys build into a fresh directory every time, so anything
// written only inside the project (e.g. public/uploads) would vanish on
// the next deploy. Files are served back out through the
// /api/uploads/[...key] route handler (src/app/api/uploads/[...key]/route.ts),
// which reads directly from this same directory — never through
// public/uploads or Next's static file serving. See that route's file
// comment for why: Hostinger's Passenger front-end serves public/* directly
// from disk without invoking the Node app, but Next's built-in image
// optimizer (/_next/image) fetches local images by simulating the request
// in-process against the Node app itself — a different code path that
// doesn't see the same directory. Routing both real traffic and the
// optimizer's internal fetch through one real route handler (not a static
// file) puts them on the identical code path, so both work the same way.

export type StoredFile = { url: string; key: string };
export type UploadStream = { stream: ReadableStream<Uint8Array>; size: number; mtimeMs: number };

// Bare filename only: `<random>.<ext>`, no slashes, no "..", no dotfiles.
// This one pattern is both the format saveLocal() ever generates AND the
// full path-traversal defense for the serving route — a key that doesn't
// match this can't reference anything outside PERSISTENT_UPLOADS_DIR.
const KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.[a-z0-9]{2,5}$/;

/**
 * Falls back to public/uploads only for local development, where there's
 * just one stable directory and requiring PERSISTENT_UPLOADS_DIR would be
 * unnecessary ceremony. Production always sets the env var.
 */
function persistentUploadsDir(): string {
  // turbopackIgnore: resolved from an env var at runtime — see the
  // explanation on the mkdir() call below, same reasoning applies to every
  // fs operation built on this path.
  return process.env.PERSISTENT_UPLOADS_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "public", "uploads");
}

export async function ensureDirectories(): Promise<void> {
  // turbopackIgnore: this path is resolved from an env var at runtime, not
  // statically importable — without the hint, Turbopack's build-time file
  // tracer treats it as "could be anywhere" and conservatively traces the
  // entire project as a dependency of this route (harmless functionally,
  // but bloats what gets traced/copied for deployment). Same pattern Next's
  // own image-optimizer uses internally for its cache directory.
  await mkdir(/* turbopackIgnore: true */ persistentUploadsDir(), { recursive: true });
}

function safeExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{2,5}$/.test(ext) ? ext : "";
}

/** True for a well-formed bare storage key — see KEY_PATTERN above. */
export function isSafeKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

/** Resolves a key to an absolute path, guaranteed to stay inside the
 * persistent uploads directory (defense in depth on top of isSafeKey). */
function resolveKeyPath(key: string): string | null {
  if (!isSafeKey(key)) return null;
  const base = path.resolve(/* turbopackIgnore: true */ persistentUploadsDir());
  const resolved = path.resolve(/* turbopackIgnore: true */ base, key);
  if (resolved !== path.join(/* turbopackIgnore: true */ base, key)) return null;
  return resolved;
}

/**
 * Older ProductImage/Setting rows may still store the pre-migration
 * `/uploads/<key>` URL; current rows store `/api/uploads/<key>`. Either way
 * the thing actually stored on disk is identified by the same bare key —
 * this pulls it out of either URL shape. Returns null for anything else
 * (S3/external URLs, unrecognized formats) since there's no local file to
 * act on in that case.
 */
export function keyFromStoredUrl(url: string): string | null {
  const match = /^\/(?:api\/)?uploads\/([^/?#]+)/.exec(url);
  if (!match) return null;
  return isSafeKey(match[1]) ? match[1] : null;
}

export function getPublicUrl(key: string): string {
  return `/api/uploads/${key}`;
}

async function saveLocal(buffer: Buffer, filename: string): Promise<StoredFile> {
  await ensureDirectories();
  const key = `${randomUUID()}${safeExt(filename)}`;
  const dest = path.join(persistentUploadsDir(), key);
  await writeFile(/* turbopackIgnore: true */ dest, buffer);

  // Verify the write actually landed before telling the caller it worked —
  // required by spec ("verify the write succeeded"), and cheap insurance
  // against a silently-truncated write on a flaky filesystem.
  const info = await stat(/* turbopackIgnore: true */ dest);
  if (info.size !== buffer.length) {
    throw new Error(`Upload verification failed for ${key}: wrote ${info.size} bytes, expected ${buffer.length}`);
  }

  return { url: getPublicUrl(key), key };
}

async function deleteLocal(key: string): Promise<void> {
  const filePath = resolveKeyPath(key);
  if (!filePath) return;
  try {
    await unlink(/* turbopackIgnore: true */ filePath);
  } catch {
    // already gone — fine
  }
}

export async function uploadExists(key: string): Promise<boolean> {
  const filePath = resolveKeyPath(key);
  if (!filePath) return false;
  try {
    const info = await stat(/* turbopackIgnore: true */ filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

/**
 * Reads a locally-stored upload as a stream, for the /api/uploads/[...key]
 * route to pipe straight into the HTTP response without buffering the
 * whole file in memory. Returns null if the key is unsafe or the file
 * doesn't exist — callers should respond 404, never leak the underlying
 * filesystem error.
 */
export async function readUploadStream(key: string): Promise<UploadStream | null> {
  const filePath = resolveKeyPath(key);
  if (!filePath) return null;
  let info;
  try {
    info = await stat(/* turbopackIgnore: true */ filePath);
  } catch {
    return null;
  }
  if (!info.isFile()) return null;
  const stream = Readable.toWeb(createReadStream(/* turbopackIgnore: true */ filePath)) as ReadableStream<Uint8Array>;
  return { stream, size: info.size, mtimeMs: info.mtimeMs };
}

async function saveS3(buffer: Buffer, filename: string, mimeType: string): Promise<StoredFile> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const key = `${randomUUID()}${safeExt(filename)}`;
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
  return { url: `${base}/${key}`, key };
}

async function deleteS3(key: string): Promise<void> {
  const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
  await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
}

export async function saveUpload(buffer: Buffer, filename: string, mimeType: string): Promise<StoredFile> {
  if (process.env.STORAGE_DRIVER === "s3") {
    return saveS3(buffer, filename, mimeType);
  }
  return saveLocal(buffer, filename);
}

export async function deleteUpload(key: string): Promise<void> {
  if (process.env.STORAGE_DRIVER === "s3") {
    return deleteS3(key);
  }
  return deleteLocal(key);
}
