import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { unauthorized } from "@/lib/apiError";
import { getBrandSlug } from "@/lib/settings";
import type { Prisma } from "@/generated/prisma/client";

function csvCell(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

// GET /api/admin/orders/export?dateFrom=&dateTo= — CSV export for a date range.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");

  const where: Prisma.OrderWhereInput = {};
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const header = [
    "Order Number", "Date", "Status", "Customer", "Phone", "City", "Address",
    "Payment Method", "Items", "Subtotal", "Shipping", "Total", "Courier", "Tracking Code",
  ];
  const rows = orders.map((o) => [
    o.orderNumber,
    o.createdAt.toISOString(),
    o.status,
    o.customerName,
    o.phone,
    o.city,
    o.address,
    o.paymentMethod,
    o.items.map((i) => `${i.qty}x ${i.productName} (${i.size})`).join("; "),
    o.subtotal,
    o.shippingFee,
    o.total,
    o.courierName || "",
    o.trackingCode || "",
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const slug = await getBrandSlug();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-orders-${Date.now()}.csv"`,
    },
  });
}
