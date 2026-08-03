import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackOrderSchema } from "@/lib/validation/order";
import { jsonError, zodErrorResponse } from "@/lib/apiError";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

// POST /api/orders/track — order number + phone must both match. Rate
// limited to slow down brute-forcing of order numbers.

export async function POST(request: NextRequest) {
  const limited = rateLimit(`track:${clientKeyFromRequest(request)}`, 15, 60_000);
  if (!limited.allowed) return jsonError("Too many requests, please try again shortly", 429);

  const body = await request.json().catch(() => null);
  const parsed = trackOrderSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { orderNumber, phone } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { select: { productName: true, size: true, qty: true, unitPrice: true } },
      statusLogs: { orderBy: { createdAt: "asc" } },
    },
  });

  // Compare only the digits so formatting differences (spaces, dashes, +92
  // vs 0) don't cause false negatives, without loosening the match itself.
  const digitsOnly = (v: string) => v.replace(/\D/g, "");
  if (!order || digitsOnly(order.phone).slice(-10) !== digitsOnly(phone).slice(-10)) {
    return jsonError("No order found for that order number and phone number", 404);
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    city: order.city,
    paymentMethod: order.paymentMethod,
    courierName: order.courierName,
    trackingCode: order.trackingCode,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    createdAt: order.createdAt,
    items: order.items,
    timeline: order.statusLogs.map((log) => ({ status: log.status, at: log.createdAt })),
  });
}
