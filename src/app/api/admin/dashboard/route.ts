import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { unauthorized } from "@/lib/apiError";

const LOW_STOCK_THRESHOLD = 5;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfWeek(): Date {
  const d = startOfToday();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  return d;
}
function startOfMonth(): Date {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

async function periodStats(since: Date) {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { notIn: ["CANCELLED"] } },
    select: { total: true },
  });
  return { orders: orders.length, revenue: orders.reduce((sum, o) => sum + o.total, 0) };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const [today, week, month, statusGroups, lowStockVariants, latestOrders] = await Promise.all([
    periodStats(startOfToday()),
    periodStats(startOfWeek()),
    periodStats(startOfMonth()),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.variant.findMany({
      where: { stockQty: { lt: LOW_STOCK_THRESHOLD } },
      orderBy: { stockQty: "asc" },
      take: 20,
      include: { product: { select: { name: true, slug: true } } },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, orderNumber: true, customerName: true, status: true, total: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    today,
    week,
    month,
    ordersByStatus: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])),
    lowStock: lowStockVariants.map((v) => ({
      variantId: v.id,
      sku: v.sku,
      size: v.size,
      stockQty: v.stockQty,
      productName: v.product.name,
      productSlug: v.product.slug,
    })),
    latestOrders,
  });
}
