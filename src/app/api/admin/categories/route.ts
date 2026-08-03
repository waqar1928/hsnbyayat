import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { createCategorySchema } from "@/lib/validation/category";
import { slugify } from "@/lib/slug";

// GET /api/admin/categories — full list (incl. inactive) with subcategories
// and product counts, for the admin Categories page and the product form's
// category/subcategory pickers.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      subcategories: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: true } } },
      },
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json({
    items: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: c._count.products,
      subcategories: c.subcategories.map((s) => ({
        id: s.id,
        categoryId: s.categoryId,
        name: s.name,
        slug: s.slug,
        sortOrder: s.sortOrder,
        isActive: s.isActive,
        productCount: s._count.products,
      })),
    })),
  });
}

// POST /api/admin/categories — create a new top-level category.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const slug = parsed.data.slug || slugify(parsed.data.name);
  const existing = await prisma.category.findFirst({ where: { OR: [{ name: parsed.data.name }, { slug }] } });
  if (existing) return jsonError("A category with this name or slug already exists", 409);

  const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const category = await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug,
      sortOrder: parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ ...category, productCount: 0, subcategories: [] }, { status: 201 });
}
