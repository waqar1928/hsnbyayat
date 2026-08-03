import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { jsonError, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { inviteAdminSchema } from "@/lib/validation/auth";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const admins = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return NextResponse.json({ items: admins });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = inviteAdminSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (existing) return jsonError("An admin with this email already exists", 409);

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await prisma.adminUser.create({
    data: { email: parsed.data.email, name: parsed.data.name, passwordHash },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return NextResponse.json(created, { status: 201 });
}
