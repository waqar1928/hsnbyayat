import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";

export const ADMIN_COOKIE = "tf_admin_session";
export const CUSTOMER_COOKIE = "tf_customer_session";

type AdminTokenPayload = { sub: string; email: string; name: string; role: "admin" };
type CustomerTokenPayload = { sub: string; phone: string; name: string; role: "customer" };

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAdminToken(payload: Omit<AdminTokenPayload, "role">): string {
  return jwt.sign({ ...payload, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
}

export function signCustomerToken(payload: Omit<CustomerTokenPayload, "role">): string {
  return jwt.sign({ ...payload, role: "customer" }, JWT_SECRET, { expiresIn: "30d" });
}

function verifyToken<T>(token: string | undefined): T | null {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch {
    return null;
  }
}

/**
 * Read the admin session from a Server Component / layout (App Router).
 * Also confirms the admin user still exists in the DB — a JWT can outlive
 * the row it was issued for (e.g. an admin removed, or a dev DB reset), and
 * without this check the layout would happily render the protected shell
 * around a session that every API route would then reject as 401.
 */
export async function getAdminSession(): Promise<AdminTokenPayload | null> {
  const store = await cookies();
  const session = verifyToken<AdminTokenPayload>(store.get(ADMIN_COOKIE)?.value);
  if (!session) return null;
  const admin = await prisma.adminUser.findUnique({ where: { id: session.sub } });
  return admin ? session : null;
}

/** Read the admin session inside a Route Handler, given the incoming request. */
export function getAdminSessionFromRequest(request: NextRequest): AdminTokenPayload | null {
  return verifyToken<AdminTokenPayload>(request.cookies.get(ADMIN_COOKIE)?.value);
}

export async function getCustomerSession(): Promise<CustomerTokenPayload | null> {
  const store = await cookies();
  return verifyToken<CustomerTokenPayload>(store.get(CUSTOMER_COOKIE)?.value);
}

export function getCustomerSessionFromRequest(request: NextRequest): CustomerTokenPayload | null {
  return verifyToken<CustomerTokenPayload>(request.cookies.get(CUSTOMER_COOKIE)?.value);
}

/** Throws-free guard for admin Route Handlers. Returns the session, or null if unauthenticated. */
export async function requireAdmin(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session) return null;
  // Confirm the admin user still exists (covers deleted/revoked admins).
  const admin = await prisma.adminUser.findUnique({ where: { id: session.sub } });
  if (!admin) return null;
  return { id: admin.id, email: admin.email, name: admin.name };
}

/**
 * Password reset tokens: only the SHA-256 hash is ever stored, mirroring
 * how the raw password itself is never stored — a DB read alone can't be
 * used to reset someone's account, only the raw token mailed to them can.
 */
export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashResetToken(raw) };
}

export function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
