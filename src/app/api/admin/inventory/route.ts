import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, notFound, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { z } from "zod";

// GET /api/admin/inventory — flat variant list, lowest stock first.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const variants = await prisma.variant.findMany({
    orderBy: { stockQty: "asc" },
    include: { product: { select: { id: true, name: true, slug: true, isActive: true } } },
  });

  return NextResponse.json({
    items: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      stockQty: v.stockQty,
      product: v.product,
    })),
  });
}

const updateStockSchema = z.object({ variantId: z.string().min(1), stockQty: z.number().int().min(0) });

// PATCH /api/admin/inventory — edit a single variant's stock quantity.
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateStockSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.variant.findUnique({ where: { id: parsed.data.variantId } });
  if (!existing) return notFound("Variant not found");

  if (!Number.isFinite(parsed.data.stockQty)) return jsonError("Invalid stock quantity", 422);

  const variant = await prisma.variant.update({
    where: { id: parsed.data.variantId },
    data: { stockQty: parsed.data.stockQty },
  });
  return NextResponse.json(variant);
}
