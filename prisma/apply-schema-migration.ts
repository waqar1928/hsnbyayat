import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { createMariaDbAdapter } from "../src/lib/dbAdapter";

// Runs as part of the production build (see package.json's "build" script),
// on every deploy — a no-op once applied. Exists because Prisma's CLI
// (`migrate deploy`, `db execute`, anything using Prisma's own schema
// engine) can't connect on this host at all (see README's "Known issue"
// section) — but the app's own PrismaClient + @prisma/adapter-mariadb
// connection, the exact one deploy-seed-if-empty.ts and
// migrate-legacy-uploads.ts already use successfully every build, works
// fine. This applies the 20260816180941_add_reviews_size_guides_banners
// migration through that same proven connection instead.
//
// Every step checks information_schema before acting, rather than relying
// on MariaDB's "IF NOT EXISTS" DDL syntax — tested against a throwaway DB
// and found NOT reliably idempotent on retry (ADD COLUMN IF NOT EXISTS can
// still fail with "Duplicate key on write or update" against an existing
// index during a retry, depending on MariaDB version/internals). Explicit
// existence checks are slower but deterministic, which matters here since
// this runs unattended during every deploy and a retry after a partial
// failure is a real scenario (MySQL DDL isn't transactional).
//
// Guarded at the top by a check against Prisma's own _prisma_migrations
// table, so `prisma migrate status` stays accurate afterwards, and future
// migrations (once this one's applied) can go back to the normal
// `prisma migrate deploy` flow if Hostinger's engine incompatibility is
// ever resolved.
const MIGRATION_NAME = "20260816180941_add_reviews_size_guides_banners";
const MIGRATION_SQL_PATH = join(__dirname, "migrations", MIGRATION_NAME, "migration.sql");

const adapter = createMariaDbAdapter();
const prisma = new PrismaClient({ adapter });

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    table
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table,
    column
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    table,
    indexName
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function constraintExists(table: string, constraintName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    table,
    constraintName
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function createTableIfMissing(table: string, ddl: string) {
  if (await tableExists(table)) {
    console.log(`  Table ${table} already exists — skipping.`);
    return;
  }
  await prisma.$executeRawUnsafe(ddl);
  console.log(`  Created table ${table}.`);
}

async function addColumnIfMissing(table: string, column: string, ddl: string) {
  if (await columnExists(table, column)) {
    console.log(`  Column ${table}.${column} already exists — skipping.`);
    return;
  }
  await prisma.$executeRawUnsafe(ddl);
  console.log(`  Added column ${table}.${column}.`);
}

async function createIndexIfMissing(table: string, indexName: string, ddl: string) {
  if (await indexExists(table, indexName)) {
    console.log(`  Index ${indexName} already exists — skipping.`);
    return;
  }
  await prisma.$executeRawUnsafe(ddl);
  console.log(`  Created index ${indexName}.`);
}

async function addConstraintIfMissing(table: string, constraintName: string, ddl: string) {
  if (await constraintExists(table, constraintName)) {
    console.log(`  Constraint ${constraintName} already exists — skipping.`);
    return;
  }
  await prisma.$executeRawUnsafe(ddl);
  console.log(`  Added constraint ${constraintName}.`);
}

async function ensureMigrationsTableExists() {
  // Defensive only — this table should already exist (it's how every
  // earlier migration on this database was tracked per the README's
  // documented manual-apply workflow). Matches Prisma's own schema exactly.
  await createTableIfMissing(
    "_prisma_migrations",
    `CREATE TABLE \`_prisma_migrations\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`checksum\` VARCHAR(64) NOT NULL,
      \`finished_at\` DATETIME(3) NULL,
      \`migration_name\` VARCHAR(255) NOT NULL,
      \`logs\` TEXT NULL,
      \`rolled_back_at\` DATETIME(3) NULL,
      \`started_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`applied_steps_count\` INT UNSIGNED NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
}

async function alreadyApplied(): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM \`_prisma_migrations\` WHERE migration_name = ? AND finished_at IS NOT NULL`,
    MIGRATION_NAME
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function recordMigration(checksum: string) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO \`_prisma_migrations\` (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
     VALUES (?, ?, NOW(3), ?, NOW(3), 1)`,
    randomUUID(),
    checksum,
    MIGRATION_NAME
  );
}

async function main() {
  await ensureMigrationsTableExists();

  if (await alreadyApplied()) {
    console.log(`Schema migration ${MIGRATION_NAME} already applied — skipping.`);
    return;
  }

  console.log(`Applying schema migration ${MIGRATION_NAME}...`);

  // --- AlterTable: nullable size-guide FK columns ---
  await addColumnIfMissing("Category", "sizeGuideId", "ALTER TABLE `Category` ADD COLUMN `sizeGuideId` VARCHAR(191) NULL");
  await addColumnIfMissing("Product", "sizeGuideId", "ALTER TABLE `Product` ADD COLUMN `sizeGuideId` VARCHAR(191) NULL");

  // --- CreateTable ---
  await createTableIfMissing(
    "ProductReview",
    `CREATE TABLE \`ProductReview\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`productId\` VARCHAR(191) NOT NULL,
      \`customerId\` VARCHAR(191) NOT NULL,
      \`rating\` INTEGER NOT NULL,
      \`title\` VARCHAR(191) NULL,
      \`body\` TEXT NOT NULL,
      \`status\` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
      \`isVerifiedPurchase\` BOOLEAN NOT NULL DEFAULT false,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      INDEX \`ProductReview_productId_status_idx\`(\`productId\`, \`status\`),
      INDEX \`ProductReview_customerId_idx\`(\`customerId\`),
      UNIQUE INDEX \`ProductReview_productId_customerId_key\`(\`productId\`, \`customerId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );

  await createTableIfMissing(
    "SizeGuide",
    `CREATE TABLE \`SizeGuide\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`name\` VARCHAR(191) NOT NULL,
      \`description\` TEXT NULL,
      \`columns\` TEXT NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );

  await createTableIfMissing(
    "SizeGuideEntry",
    `CREATE TABLE \`SizeGuideEntry\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`sizeGuideId\` VARCHAR(191) NOT NULL,
      \`size\` VARCHAR(191) NOT NULL,
      \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
      \`values\` TEXT NOT NULL,
      INDEX \`SizeGuideEntry_sizeGuideId_idx\`(\`sizeGuideId\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );

  await createTableIfMissing(
    "Banner",
    `CREATE TABLE \`Banner\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`heading\` VARCHAR(191) NOT NULL,
      \`description\` TEXT NULL,
      \`ctaText\` VARCHAR(191) NULL,
      \`ctaUrl\` VARCHAR(191) NULL,
      \`desktopImageUrl\` VARCHAR(191) NOT NULL,
      \`mobileImageUrl\` VARCHAR(191) NULL,
      \`isActive\` BOOLEAN NOT NULL DEFAULT true,
      \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
      \`startsAt\` DATETIME(3) NULL,
      \`endsAt\` DATETIME(3) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      INDEX \`Banner_isActive_sortOrder_idx\`(\`isActive\`, \`sortOrder\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );

  // --- CreateIndex (on the new Category/Product columns) ---
  await createIndexIfMissing(
    "Category",
    "Category_sizeGuideId_idx",
    "CREATE INDEX `Category_sizeGuideId_idx` ON `Category`(`sizeGuideId`)"
  );
  await createIndexIfMissing(
    "Product",
    "Product_sizeGuideId_idx",
    "CREATE INDEX `Product_sizeGuideId_idx` ON `Product`(`sizeGuideId`)"
  );

  // --- AddForeignKey ---
  await addConstraintIfMissing(
    "Category",
    "Category_sizeGuideId_fkey",
    "ALTER TABLE `Category` ADD CONSTRAINT `Category_sizeGuideId_fkey` FOREIGN KEY (`sizeGuideId`) REFERENCES `SizeGuide`(`id`) ON DELETE SET NULL ON UPDATE CASCADE"
  );
  await addConstraintIfMissing(
    "Product",
    "Product_sizeGuideId_fkey",
    "ALTER TABLE `Product` ADD CONSTRAINT `Product_sizeGuideId_fkey` FOREIGN KEY (`sizeGuideId`) REFERENCES `SizeGuide`(`id`) ON DELETE SET NULL ON UPDATE CASCADE"
  );
  await addConstraintIfMissing(
    "ProductReview",
    "ProductReview_productId_fkey",
    "ALTER TABLE `ProductReview` ADD CONSTRAINT `ProductReview_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
  );
  await addConstraintIfMissing(
    "ProductReview",
    "ProductReview_customerId_fkey",
    "ALTER TABLE `ProductReview` ADD CONSTRAINT `ProductReview_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
  );
  await addConstraintIfMissing(
    "SizeGuideEntry",
    "SizeGuideEntry_sizeGuideId_fkey",
    "ALTER TABLE `SizeGuideEntry` ADD CONSTRAINT `SizeGuideEntry_sizeGuideId_fkey` FOREIGN KEY (`sizeGuideId`) REFERENCES `SizeGuide`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
  );

  const checksum = createHash("sha256").update(readFileSync(MIGRATION_SQL_PATH)).digest("hex");
  await recordMigration(checksum);
  console.log(`Migration ${MIGRATION_NAME} applied and recorded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
