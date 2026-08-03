import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, notFound, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { updateSubcategorySchema } from "@/lib/validation/category";
import { slugify } from "@/lib/slug";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.subcategory.findUnique({ where: { id } });
  if (!existing) return notFound("Subcategory not found");

  const body = await request.json().catch(() => null);
  const parsed = updateSubcategorySchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const categoryId = parsed.data.categoryId ?? existing.categoryId;
  const slug = parsed.data.slug || (parsed.data.name ? slugify(parsed.data.name) : existing.slug);

  if (slug !== existing.slug || categoryId !== existing.categoryId || (parsed.data.name && parsed.data.name !== existing.name)) {
    const clash = await prisma.subcategory.findFirst({
      where: { id: { not: id }, categoryId, OR: [{ name: parsed.data.name || existing.name }, { slug }] },
    });
    if (clash) return jsonError("This category already has a subcategory with that name or slug", 409);
  }

  const subcategory = await prisma.subcategory.update({
    where: { id },
    data: {
      categoryId,
      name: parsed.data.name ?? existing.name,
      slug,
      sortOrder: parsed.data.sortOrder ?? existing.sortOrder,
      isActive: parsed.data.isActive ?? existing.isActive,
    },
  });

  return NextResponse.json(subcategory);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const subcategory = await prisma.subcategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!subcategory) return notFound("Subcategory not found");

  if (subcategory._count.products > 0) {
    return jsonError(
      `Can't delete — ${subcategory._count.products} product(s) still use this subcategory. Deactivate it instead, or move those products first.`,
      409
    );
  }

  await prisma.subcategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
