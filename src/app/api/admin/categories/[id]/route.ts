import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, notFound, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { updateCategorySchema } from "@/lib/validation/category";
import { slugify } from "@/lib/slug";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return notFound("Category not found");

  const body = await request.json().catch(() => null);
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const slug = parsed.data.slug || (parsed.data.name ? slugify(parsed.data.name) : existing.slug);
  if (slug !== existing.slug || (parsed.data.name && parsed.data.name !== existing.name)) {
    const clash = await prisma.category.findFirst({
      where: { id: { not: id }, OR: [{ name: parsed.data.name || existing.name }, { slug }] },
    });
    if (clash) return jsonError("A category with this name or slug already exists", 409);
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: parsed.data.name ?? existing.name,
      slug,
      sortOrder: parsed.data.sortOrder ?? existing.sortOrder,
      isActive: parsed.data.isActive ?? existing.isActive,
    },
  });

  return NextResponse.json(category);
}

// Deactivate is the normal path (mirrors Product soft-delete). Real deletion
// is only allowed once nothing references the category, since deleting a
// category with products would either orphan them or (with our FK setup)
// fail anyway — better to say so clearly than let it 500.
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, subcategories: true } } },
  });
  if (!category) return notFound("Category not found");

  if (category._count.products > 0) {
    return jsonError(
      `Can't delete — ${category._count.products} product(s) still use this category. Deactivate it instead, or move those products first.`,
      409
    );
  }

  await prisma.category.delete({ where: { id } }); // cascades to any (empty) subcategories
  return NextResponse.json({ ok: true });
}
