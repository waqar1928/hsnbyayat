import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { notFound, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { bannerSchema } from "@/lib/validation/banner";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PUT(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) return notFound("Banner not found");

  const body = await request.json().catch(() => null);
  const parsed = bannerSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  const banner = await prisma.banner.update({
    where: { id },
    data: {
      heading: input.heading,
      description: input.description || null,
      ctaText: input.ctaText || null,
      ctaUrl: input.ctaUrl || null,
      desktopImageUrl: input.desktopImageUrl,
      mobileImageUrl: input.mobileImageUrl || null,
      isActive: input.isActive,
      sortOrder: input.sortOrder,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    },
  });

  return NextResponse.json(banner);
}

// PATCH — small partial updates (activate/deactivate, reorder) without
// resubmitting the whole banner, same shape as the categories PATCH.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) return notFound("Banner not found");

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const banner = await prisma.banner.update({ where: { id }, data: parsed.data });
  return NextResponse.json(banner);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.banner.findUnique({ where: { id } });
  if (!existing) return notFound("Banner not found");

  await prisma.banner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
