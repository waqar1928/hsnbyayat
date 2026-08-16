import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitReviewSchema } from "@/lib/validation/review";
import { jsonError, zodErrorResponse } from "@/lib/apiError";
import { getCustomerSessionFromRequest } from "@/lib/auth";
import { hasVerifiedPurchase } from "@/lib/reviews";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

// GET /api/reviews?productId=... — public, APPROVED reviews only. Pending/
// rejected reviews are never exposed outside the admin moderation API.
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) return jsonError("productId is required", 400);

  const reviews = await prisma.productReview.findMany({
    where: { productId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } } },
  });

  return NextResponse.json({
    items: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      customerName: r.customer.name,
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt,
    })),
  });
}

// POST /api/reviews — create or update the logged-in customer's own review
// for a product. Requires a customer account (see ProductReview's schema
// comment for why this bar, not full anonymity, is where we draw the
// line). New/edited reviews always reset to PENDING so an edit can't be
// used to slip changed content past moderation that already approved the
// original text.
export async function POST(request: NextRequest) {
  const limited = rateLimit(`review:${clientKeyFromRequest(request)}`, 10, 60_000);
  if (!limited.allowed) return jsonError("Too many requests, please try again shortly", 429);

  const customer = getCustomerSessionFromRequest(request);
  if (!customer) return jsonError("Please log in to write a review", 401);

  const body = await request.json().catch(() => null);
  const parsed = submitReviewSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true, isActive: true } });
  if (!product || !product.isActive) return jsonError("Product not found", 404);

  const verified = await hasVerifiedPurchase(customer.sub, input.productId);

  const review = await prisma.productReview.upsert({
    where: { productId_customerId: { productId: input.productId, customerId: customer.sub } },
    create: {
      productId: input.productId,
      customerId: customer.sub,
      rating: input.rating,
      title: input.title || null,
      body: input.body,
      isVerifiedPurchase: verified,
      status: "PENDING",
    },
    update: {
      rating: input.rating,
      title: input.title || null,
      body: input.body,
      isVerifiedPurchase: verified,
      status: "PENDING",
    },
  });

  return NextResponse.json(
    { id: review.id, status: review.status, message: "Thanks! Your review is awaiting approval." },
    { status: 201 }
  );
}
