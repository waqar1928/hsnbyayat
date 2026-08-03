import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { jsonError, zodErrorResponse } from "@/lib/apiError";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";
import { hashPassword, hashResetToken } from "@/lib/auth";

// POST /api/admin/auth/reset-password — consumes a token minted by
// /forgot-password. Single-use, expires after 1 hour.
export async function POST(request: NextRequest) {
  const limited = rateLimit(`admin-reset:${clientKeyFromRequest(request)}`, 10, 60_000);
  if (!limited.allowed) return jsonError("Too many requests, please try again shortly", 429);

  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const tokenHash = hashResetToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return jsonError("This reset link is invalid or has expired. Request a new one.", 400);
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);

  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: record.adminId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Invalidate any other outstanding reset requests for this admin.
    prisma.passwordResetToken.updateMany({
      where: { adminId: record.adminId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
