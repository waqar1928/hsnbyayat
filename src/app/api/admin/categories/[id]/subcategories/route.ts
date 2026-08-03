import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, notFound, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { createSubcategorySchema } from "@/lib/validation/category";
import { slugify } from "@/lib/slug";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/categories/[id]/subcategories — add a subcategory under this category.
export async function POST(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id: categoryId } = await ctx.params;
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return notFound("Category not found");

  const body = await request.json().catch(() => null);
  const parsed = createSubcategorySchema.safeParse({ ...body, categoryId });
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const slug = parsed.data.slug || slugify(parsed.data.name);
  const clash = await prisma.subcategory.findFirst({
    where: { categoryId, OR: [{ name: parsed.data.name }, { slug }] },
  });
  if (clash) return jsonError("This category already has a subcategory with that name or slug", 409);

  const maxSort = await prisma.subcategory.aggregate({ where: { categoryId }, _max: { sortOrder: true } });
  const subcategory = await prisma.subcategory.create({
    data: {
      categoryId,
      name: parsed.data.name,
      slug,
      sortOrder: parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ ...subcategory, productCount: 0 }, { status: 201 });
}
