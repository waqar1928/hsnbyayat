import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { unauthorized } from "@/lib/apiError";
import type { Prisma } from "@/generated/prisma/client";
import { orderStatusSchema } from "@/lib/validation/order";

// GET /api/admin/orders — filterable/searchable order table.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const status = sp.get("status");
  const city = sp.get("city")?.trim();
  const paymentMethod = sp.get("paymentMethod");
  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize")) || 25));

  const where: Prisma.OrderWhereInput = {};
  if (q) where.OR = [{ orderNumber: { contains: q } }, { phone: { contains: q } }];
  const statusParsed = orderStatusSchema.safeParse(status);
  if (statusParsed.success) where.status = statusParsed.data;
  if (city) where.city = { contains: city };
  if (paymentMethod === "COD" || paymentMethod === "BANK_TRANSFER") where.paymentMethod = paymentMethod;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { items: { select: { qty: true } } },
    }),
  ]);

  return NextResponse.json({
    items: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      phone: o.phone,
      city: o.city,
      paymentMethod: o.paymentMethod,
      status: o.status,
      total: o.total,
      itemCount: o.items.reduce((sum, i) => sum + i.qty, 0),
      createdAt: o.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
