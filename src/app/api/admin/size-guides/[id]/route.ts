import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { notFound, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { sizeGuideSchema } from "@/lib/validation/sizeGuide";
import { getSizeGuideById } from "@/lib/sizeGuide";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const guide = await getSizeGuideById(id);
  if (!guide) return notFound("Size guide not found");
  return NextResponse.json(guide);
}

// PUT — full-object replace, same pattern as products: entries are
// recreated from scratch each save (delete + create in a transaction)
// rather than diffed, since a size chart's rows rarely number more than a
// handful and the admin form always submits the complete set.
export async function PUT(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.sizeGuide.findUnique({ where: { id } });
  if (!existing) return notFound("Size guide not found");

  const body = await request.json().catch(() => null);
  const parsed = sizeGuideSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  await prisma.$transaction([
    prisma.sizeGuideEntry.deleteMany({ where: { sizeGuideId: id } }),
    prisma.sizeGuide.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description || null,
        columns: JSON.stringify(input.columns),
        entries: {
          create: input.entries.map((e, i) => ({
            size: e.size,
            sortOrder: e.sortOrder ?? i,
            values: JSON.stringify(e.values),
          })),
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

// DELETE — Product.sizeGuideId / Category.sizeGuideId both use onDelete:
// SetNull, so removing a guide that's still attached just clears the
// attachment (storefront quietly stops showing "Size Guide") rather than
// failing with a foreign-key error or cascading into product data.
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.sizeGuide.findUnique({ where: { id } });
  if (!existing) return notFound("Size guide not found");

  await prisma.sizeGuide.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
