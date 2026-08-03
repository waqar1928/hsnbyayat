import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { notFound, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { updateOrderStatusSchema } from "@/lib/validation/order";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      statusLogs: { orderBy: { createdAt: "asc" } },
      customer: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order) return notFound("Order not found");
  return NextResponse.json(order);
}

// PATCH — update status (logged with a timestamp) and/or courier info.
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return notFound("Order not found");

  const body = await request.json().catch(() => null);
  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { status, courierName, trackingCode } = parsed.data;

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: {
        status,
        courierName: courierName ?? existing.courierName,
        trackingCode: trackingCode ?? existing.trackingCode,
      },
    });
    if (status !== existing.status) {
      await tx.orderStatusLog.create({ data: { orderId: id, status } });
    }
    return updated;
  });

  return NextResponse.json(order);
}
