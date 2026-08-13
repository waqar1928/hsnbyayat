import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Storage abstraction: local disk in development, S3-compatible (Cloudflare
// R2, AWS S3, ...) in production. Selected via STORAGE_DRIVER env var.
// Callers only ever see { url, key } — never a filesystem path.

export type StoredFile = { url: string; key: string };

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Optional, set only on hosts whose deploy pipeline builds into a fresh
// directory every time (confirmed on Hostinger's Git-based Node.js App
// deploys), so public/uploads would otherwise start empty on every deploy.
// public/uploads stays a normal directory — see
// scripts/sync-persistent-uploads.js for the deploy-time copy of already-
// persisted files into it, and PERSISTENT_UPLOAD_DIR() below for the other
// half: every new upload also gets written straight to this directory, so
// it's there for the *next* deploy's copy step to pick up. Unset (local
// dev, or any host with one stable directory) means this is simply never
// consulted — saveLocal/deleteLocal behave exactly as before.
function persistentUploadDir(): string | null {
  return process.env.PERSISTENT_UPLOADS_DIR || null;
}

function safeExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{2,5}$/.test(ext) ? ext : "";
}

async function saveLocal(buffer: Buffer, filename: string): Promise<StoredFile> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const key = `${randomUUID()}${safeExt(filename)}`;
  await writeFile(path.join(UPLOAD_DIR, key), buffer);

  const persistentDir = persistentUploadDir();
  if (persistentDir) {
    // Best-effort: the upload has already succeeded from the caller's
    // point of view (the file the running app needs to serve right now is
    // written above) — a failure to also persist it for future deploys
    // shouldn't fail the upload request itself, just risk that one file
    // needing a manual re-upload after the next deploy.
    try {
      await mkdir(persistentDir, { recursive: true });
      await writeFile(path.join(persistentDir, key), buffer);
    } catch (err) {
      console.error(`Failed to mirror upload ${key} to PERSISTENT_UPLOADS_DIR:`, err);
    }
  }

  return { url: `/uploads/${key}`, key };
}

async function deleteLocal(key: string): Promise<void> {
  try {
    await unlink(path.join(UPLOAD_DIR, key));
  } catch {
    // already gone — fine
  }
  const persistentDir = persistentUploadDir();
  if (persistentDir) {
    try {
      await unlink(path.join(persistentDir, key));
    } catch {
      // already gone, or was never mirrored (e.g. uploaded before this
      // feature existed) — fine either way.
    }
  }
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
