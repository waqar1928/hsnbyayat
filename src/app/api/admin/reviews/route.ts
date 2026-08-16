import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { unauthorized } from "@/lib/apiError";
import type { Prisma } from "@/generated/prisma/client";
import { ReviewStatus } from "@/generated/prisma/enums";

// GET /api/admin/reviews?status=PENDING&productId=... — admin moderation
// queue. Unlike the public GET /api/reviews, this returns every status so
// admins can see what's waiting, approved, and rejected.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const status = request.nextUrl.searchParams.get("status");
  const productId = request.nextUrl.searchParams.get("productId");

  const where: Prisma.ProductReviewWhereInput = {};
  if (status && (Object.values(ReviewStatus) as string[]).includes(status)) {
    where.status = status as ReviewStatus;
  }
  if (productId) where.productId = productId;

  const reviews = await prisma.productReview.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, phone: true } },
      product: { select: { name: true, slug: true } },
    },
  });

  return NextResponse.json({
    items: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      customerName: r.customer.name,
      customerPhone: r.customer.phone,
      productName: r.product.name,
      productSlug: r.product.slug,
    })),
  });
}
