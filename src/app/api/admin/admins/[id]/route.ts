import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { jsonError, notFound, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { adminResetPasswordSchema } from "@/lib/validation/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  if (id === admin.id) return jsonError("You can't remove your own admin account", 400);

  const existing = await prisma.adminUser.findUnique({ where: { id } });
  if (!existing) return notFound("Admin not found");

  const total = await prisma.adminUser.count();
  if (total <= 1) return jsonError("Can't remove the last remaining admin", 400);

  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/admins/[id] — reset another admin's password directly.
// Deliberately blocked for your own account: self-service password change
// (PATCH /api/admin/auth/password, requires the current password) is the
// safer path there, and letting this route double as a no-current-password
// self-reset would undermine that. Any authenticated admin can reset any
// *other* admin's password — this app has no roles/permissions tiers, every
// admin already has equal standing (e.g. any admin can already remove any
// other admin above).
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  if (id === admin.id) {
    return jsonError("Use \"Change my password\" for your own account instead.", 400);
  }

  const existing = await prisma.adminUser.findUnique({ where: { id } });
  if (!existing) return notFound("Admin not found");

  const body = await request.json().catch(() => null);
  const parsed = adminResetPasswordSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.adminUser.update({ where: { id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
