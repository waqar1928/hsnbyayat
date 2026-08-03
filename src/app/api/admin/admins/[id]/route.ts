import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, notFound, unauthorized } from "@/lib/apiError";

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
