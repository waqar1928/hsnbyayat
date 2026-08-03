import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Runs against MySQL/MariaDB (e.g. the database bundled with Hostinger
// hosting) via the @prisma/adapter-mariadb driver adapter. DATABASE_URL is a
// standard MySQL connection string: mysql://user:password@host:port/dbname
// To move to Postgres instead: set `provider = "postgresql"` in
// prisma/schema.prisma, run `npm install @prisma/adapter-pg pg`, and swap the
// adapter below for `new PrismaPg({ connectionString: process.env.DATABASE_URL })`.
// See README.md.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaMariaDb(process.env.DATABASE_URL || "");

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
