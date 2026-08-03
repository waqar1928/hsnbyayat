import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword, verifyPassword } from "@/lib/auth";
import { jsonError, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { changePasswordSchema } from "@/lib/validation/auth";

// PATCH /api/admin/auth/password — self-service password change for the
// currently logged-in admin. Requires the current password.
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const full = await prisma.adminUser.findUnique({ where: { id: admin.id } });
  if (!full || !(await verifyPassword(parsed.data.currentPassword, full.passwordHash))) {
    return jsonError("Current password is incorrect", 401);
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
