import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { jsonError, zodErrorResponse } from "@/lib/apiError";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";
import { generateResetToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// POST /api/admin/auth/forgot-password — always returns a generic success
// message, whether or not the email matches an admin, so this endpoint
// can't be used to enumerate which emails have admin accounts.
export async function POST(request: NextRequest) {
  const limited = rateLimit(`admin-forgot:${clientKeyFromRequest(request)}`, 5, 60_000);
  if (!limited.allowed) return jsonError("Too many requests, please try again shortly", 429);

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const admin = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });

  if (admin) {
    const { raw, hash } = generateResetToken();
    await prisma.passwordResetToken.create({
      data: { adminId: admin.id, tokenHash: hash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });

    const resetUrl = `${request.nextUrl.origin}/admin/reset-password?token=${raw}`;
    await sendEmail({
      to: admin.email,
      subject: "Reset your admin password",
      text: `Hi ${admin.name},\n\nSomeone requested a password reset for your admin account. This link expires in 1 hour:\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
      html: `<p>Hi ${admin.name},</p><p>Someone requested a password reset for your admin account. This link expires in 1 hour:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    });
  }

  return NextResponse.json({
    ok: true,
    message: "If that email has an admin account, a reset link has been sent.",
  });
}
