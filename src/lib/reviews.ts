import { prisma } from "@/lib/prisma";

// Order statuses that count as "this customer actually bought it" for the
// verified-purchase badge. Deliberately excludes PENDING (not yet
// confirmed — could still fall through), CANCELLED, and RETURNED. Matches
// the same statuses the tracking page treats as a real, in-progress-or-done
// order. See prisma/schema.prisma's OrderStatus enum.
const VERIFIED_PURCHASE_STATUSES = ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"] as const;

/** True if this customer has an order (in a qualifying status) containing this product. */
export async function hasVerifiedPurchase(customerId: string, productId: string): Promise<boolean> {
  const match = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { customerId, status: { in: [...VERIFIED_PURCHASE_STATUSES] } },
    },
    select: { id: true },
  });
  return !!match;
}

export type ReviewSummary = {
  average: number;
  count: number;
  breakdown: { rating: number; count: number }[]; // 5 → 1, always all 5 present (0 if none)
};

/** Aggregate stats over APPROVED reviews only — never counts pending/rejected. */
export async function getReviewSummary(productId: string): Promise<ReviewSummary> {
  const rows = await prisma.productReview.groupBy({
    by: ["rating"],
    where: { productId, status: "APPROVED" },
    _count: { rating: true },
  });

  const countByRating = new Map(rows.map((r) => [r.rating, r._count.rating]));
  const breakdown = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: countByRating.get(rating) || 0 }));
  const count = breakdown.reduce((sum, b) => sum + b.count, 0);
  const weighted = breakdown.reduce((sum, b) => sum + b.rating * b.count, 0);

  return {
    average: count > 0 ? Math.round((weighted / count) * 10) / 10 : 0,
    count,
    breakdown,
  };
}
