import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, notFound, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { updateProductSchema, productToggleSchema } from "@/lib/validation/product";
import { pctFromPrice } from "@/lib/money";
import { deleteUpload } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!product) return notFound("Product not found");
  return NextResponse.json(product);
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, images: true },
  });
  if (!existing) return notFound("Product not found");

  const body = await request.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  if (input.slug !== existing.slug) {
    const slugTaken = await prisma.product.findUnique({ where: { slug: input.slug } });
    if (slugTaken) return jsonError("A product with this slug already exists", 409);
  }

  const subcategory = await prisma.subcategory.findUnique({ where: { id: input.subcategoryId } });
  if (!subcategory || subcategory.categoryId !== input.categoryId) {
    return notFound("That subcategory doesn't belong to the selected category");
  }

  const salePct = input.salePrice ? pctFromPrice(input.price, input.salePrice) : null;

  const keepVariantIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id!));
  const removedVariants = existing.variants.filter((v) => !keepVariantIds.has(v.id));

  const keepImageIds = new Set(input.images.filter((i) => i.id).map((i) => i.id!));
  const removedImages = existing.images.filter((i) => !keepImageIds.has(i.id));

  try {
    const product = await prisma.$transaction(async (tx) => {
      if (removedVariants.length) {
        await tx.variant.deleteMany({ where: { id: { in: removedVariants.map((v) => v.id) } } });
      }
      if (removedImages.length) {
        await tx.productImage.deleteMany({ where: { id: { in: removedImages.map((i) => i.id) } } });
      }

      for (const v of input.variants) {
        if (v.id) {
          await tx.variant.update({ where: { id: v.id }, data: { size: v.size, sku: v.sku, stockQty: v.stockQty } });
        } else {
          await tx.variant.create({ data: { productId: id, size: v.size, sku: v.sku, stockQty: v.stockQty } });
        }
      }

      for (const img of input.images) {
        if (img.id) {
          await tx.productImage.update({
            where: { id: img.id },
            data: { url: img.url, altText: img.altText ?? null, sortOrder: img.sortOrder },
          });
        } else {
          await tx.productImage.create({
            data: { productId: id, url: img.url, altText: img.altText ?? null, sortOrder: img.sortOrder },
          });
        }
      }

      return tx.product.update({
        where: { id },
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
        },
        include: { variants: true, images: { orderBy: { sortOrder: "asc" } } },
      });
    });

    // Best-effort cleanup of files for removed images — not part of the DB
    // transaction since storage isn't transactional; a stray orphaned file
    // is a much smaller problem than losing product data.
    for (const img of removedImages) {
      const key = img.url.split("/uploads/")[1];
      if (key) deleteUpload(key).catch(() => {});
    }

    return NextResponse.json(product);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Foreign key constraint")) {
      return jsonError(
        "Can't remove a size that's referenced by existing orders — set its stock to 0 instead.",
        409
      );
    }
    throw err;
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = productToggleSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return notFound("Product not found");

  const product = await prisma.product.update({ where: { id }, data: parsed.data });
  return NextResponse.json(product);
}

// Soft delete only — products referenced by orders are never hard-deleted.
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return notFound("Product not found");

  const product = await prisma.product.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json(product);
}
