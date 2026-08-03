import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, notFound, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { createProductSchema } from "@/lib/validation/product";
import { pctFromPrice } from "@/lib/money";
import type { Prisma } from "@/generated/prisma/client";

// GET /api/admin/products — search + filter table for the admin product list.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const categoryId = sp.get("categoryId");
  const activeParam = sp.get("active"); // "true" | "false" | null (all)
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 25));

  const where: Prisma.ProductWhereInput = {};
  if (q) where.name = { contains: q };
  if (categoryId) where.categoryId = categoryId;
  if (activeParam === "true") where.isActive = true;
  if (activeParam === "false") where.isActive = false;

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: true,
      },
    }),
  ]);

  return NextResponse.json({
    items: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      group: p.category.name,
      subcategory: p.subcategory.name,
      price: p.price,
      salePrice: p.salePrice,
      salePct: p.salePct,
      badge: p.badge,
      isBestSeller: p.isBestSeller,
      isActive: p.isActive,
      totalStock: p.variants.reduce((sum, v) => sum + v.stockQty, 0),
      image: p.images[0]?.url ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

// POST /api/admin/products — create a product with its variants and images.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  const existingSlug = await prisma.product.findUnique({ where: { slug: input.slug } });
  if (existingSlug) return jsonError("A product with this slug already exists", 409);

  const subcategory = await prisma.subcategory.findUnique({ where: { id: input.subcategoryId } });
  if (!subcategory || subcategory.categoryId !== input.categoryId) {
    return notFound("That subcategory doesn't belong to the selected category");
  }

  const salePct = input.salePrice ? pctFromPrice(input.price, input.salePrice) : null;

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      price: input.price,
      salePrice: input.salePrice ?? null,
      salePct,
      badge: input.badge ?? null,
      isBestSeller: input.isBestSeller,
      isActive: input.isActive,
      variants: { create: input.variants.map((v) => ({ size: v.size, sku: v.sku, stockQty: v.stockQty })) },
      images: {
        create: input.images.map((img) => ({ url: img.url, altText: img.altText ?? null, sortOrder: img.sortOrder })),
      },
    },
    include: { variants: true, images: true },
  });

  return NextResponse.json(product, { status: 201 });
}
