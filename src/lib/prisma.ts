import { PrismaClient } from "@/generated/prisma/client";
import { createMariaDbAdapter } from "@/lib/dbAdapter";

// Runs against MySQL/MariaDB (e.g. the database bundled with Hostinger
// hosting) via the @prisma/adapter-mariadb driver adapter. DATABASE_URL is a
// standard MySQL connection string: mysql://user:password@host:port/dbname
// (see src/lib/dbAdapter.ts for the optional DATABASE_SOCKET_PATH mode).
// To move to Postgres instead: set `provider = "postgresql"` in
// prisma/schema.prisma, run `npm install @prisma/adapter-pg pg`, and swap the
// adapter below for `new PrismaPg({ connectionString: process.env.DATABASE_URL })`.
// See README.md.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = createMariaDbAdapter();

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
