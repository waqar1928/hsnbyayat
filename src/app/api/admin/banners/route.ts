import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { unauthorized, zodErrorResponse } from "@/lib/apiError";
import { bannerSchema } from "@/lib/validation/banner";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ items: banners });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = bannerSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  const maxSort = await prisma.banner.aggregate({ _max: { sortOrder: true } });
  const banner = await prisma.banner.create({
    data: {
      heading: input.heading,
      description: input.description || null,
      ctaText: input.ctaText || null,
      ctaUrl: input.ctaUrl || null,
      desktopImageUrl: input.desktopImageUrl,
      mobileImageUrl: input.mobileImageUrl || null,
      isActive: input.isActive,
      sortOrder: input.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    },
  });

  return NextResponse.json(banner, { status: 201 });
}
