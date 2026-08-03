import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { createMariaDbAdapter } from "../src/lib/dbAdapter";

// Runs as part of the production build (see package.json's "build" script),
// on every deploy. Unlike `npm run db:seed` — a dev tool meant to be run
// deliberately, which resets the admin password/name to match
// ADMIN_EMAIL/ADMIN_PASSWORD every time — this only seeds a database that
// is genuinely empty (no admin users yet). On every subsequent deploy it's
// a fast no-op, and it will never clobber an admin password that's since
// been changed through the live site.
const adapter = createMariaDbAdapter();
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminCount = await prisma.adminUser.count();
  if (adminCount > 0) {
    console.log(`Skipping seed — ${adminCount} admin user(s) already exist.`);
    return;
  }
  console.log("No admin users found — running initial seed...");
  const { execSync } = await import("node:child_process");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
