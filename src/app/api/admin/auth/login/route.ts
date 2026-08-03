import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminLoginSchema } from "@/lib/validation/auth";
import { jsonError, zodErrorResponse } from "@/lib/apiError";
import { verifyPassword, signAdminToken, ADMIN_COOKIE } from "@/lib/auth";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(`admin-login:${clientKeyFromRequest(request)}`, 10, 60_000);
  if (!limited.allowed) return jsonError("Too many attempts, please try again shortly", 429);

  const body = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const admin = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (!admin || !(await verifyPassword(parsed.data.password, admin.passwordHash))) {
    return jsonError("Invalid email or password", 401);
  }

  const token = signAdminToken({ sub: admin.id, email: admin.email, name: admin.name });
  const res = NextResponse.json({ id: admin.id, email: admin.email, name: admin.name });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
