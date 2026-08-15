import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { createMariaDbAdapter } from "../src/lib/dbAdapter";
import { uploadExists, keyFromStoredUrl, getPublicUrl } from "../src/lib/storage";

// Runs as part of the production build (see package.json's "build" script),
// on every deploy — fully idempotent, safe to leave in place indefinitely.
//
// Rewrites ProductImage.url and the "brand" Setting's logoUrl from the
// pre-fix `/uploads/<key>` format to the current `/api/uploads/<key>`
// format (see src/app/api/uploads/[...key]/route.ts for why that route
// exists — Next's image optimizer can't reliably serve local images
// through Passenger's static public/ path on this host).
//
// Only rewrites a row once the target file is CONFIRMED present in
// PERSISTENT_UPLOADS_DIR — never repoints a row at a URL that would 404.
// Rows whose file isn't there (uploaded before persistent-storage writes
// existed) are left untouched and logged; re-uploading that image through
// the admin panel is the safe remedy, since every upload is now written
// straight to PERSISTENT_UPLOADS_DIR and stored in the new URL format from
// the start.
const adapter = createMariaDbAdapter();
const prisma = new PrismaClient({ adapter });

const LEGACY_PREFIX = "/uploads/";

async function migrateProductImages() {
  const legacy = await prisma.productImage.findMany({ where: { url: { startsWith: LEGACY_PREFIX } } });
  let migrated = 0;
  const skippedKeys: string[] = [];
  for (const image of legacy) {
    const key = keyFromStoredUrl(image.url);
    if (!key || !(await uploadExists(key))) {
      skippedKeys.push(key ?? image.url);
      continue;
    }
    await prisma.productImage.update({ where: { id: image.id }, data: { url: getPublicUrl(key) } });
    migrated++;
  }
  return { migrated, skippedKeys, total: legacy.length };
}

async function migrateBrandLogo() {
  const row = await prisma.setting.findUnique({ where: { key: "brand" } });
  if (!row) return { migrated: false, reason: "no brand setting row yet" };

  let brand: Record<string, unknown>;
  try {
    brand = JSON.parse(row.value);
  } catch {
    return { migrated: false, reason: "brand setting value isn't valid JSON" };
  }

  const logoUrl = typeof brand.logoUrl === "string" ? brand.logoUrl : null;
  if (!logoUrl || !logoUrl.startsWith(LEGACY_PREFIX)) {
    return { migrated: false, reason: "no legacy logo URL to migrate" };
  }

  const key = keyFromStoredUrl(logoUrl);
  if (!key || !(await uploadExists(key))) {
    return { migrated: false, reason: `logo file not found in PERSISTENT_UPLOADS_DIR (key: ${key ?? "unparseable"}) — re-upload the logo to fix` };
  }

  brand.logoUrl = getPublicUrl(key);
  await prisma.setting.update({ where: { key: "brand" }, data: { value: JSON.stringify(brand) } });
  return { migrated: true };
}

async function main() {
  const images = await migrateProductImages();
  console.log(
    `Legacy product image URLs: migrated ${images.migrated}/${images.total}.` +
      (images.skippedKeys.length ? ` Skipped (file not found in PERSISTENT_UPLOADS_DIR — re-upload to fix): ${images.skippedKeys.join(", ")}` : "")
  );

  const logo = await migrateBrandLogo();
  console.log(`Brand logo URL: ${logo.migrated ? "migrated" : `not migrated (${logo.reason})`}`);
}

main()
  .catch((e) => {
    // Non-fatal by design — this is a data cleanup step, not core deploy
    // machinery. A transient failure here shouldn't block the whole build;
    // it'll simply retry on the next deploy (fully idempotent).
    console.error("migrate-legacy-uploads: non-fatal error, continuing build:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
