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

// Retries a brief connection hiccup (a few seconds to ~a minute — a blip,
// not an outage) rather than failing the whole build over it. Confirmed in
// production: this exact query failed once with a 10s pool timeout during
// a period where the whole server was briefly unreachable, then succeeded
// again once that cleared. This does NOT make the build resilient to a
// genuine, extended database outage — nothing can build a page that needs
// live data from a database that's actually down, and it shouldn't pretend
// otherwise. It only smooths over the "still coming back online" window.
async function countAdminsWithRetry(maxAttempts = 5): Promise<number> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.adminUser.count();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const waitMs = attempt * 5000; // 5s, 10s, 15s, 20s — ~50s total across 5 attempts
      console.warn(`Database not reachable yet (attempt ${attempt}/${maxAttempts}) — retrying in ${waitMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  // Unreachable — the loop above always returns or throws — but keeps TS happy.
  throw new Error("unreachable");
}

async function main() {
  const adminCount = await countAdminsWithRetry();
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
