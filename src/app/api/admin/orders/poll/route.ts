import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { unauthorized } from "@/lib/apiError";

// GET /api/admin/orders/poll?since=<ISO timestamp>
// Lightweight endpoint the admin UI polls every ~15s to detect new orders
// without refreshing — returns just the handful of fields needed for a
// notification, not the full order detail. `serverTime` is echoed back so
// the client advances its cursor using the server's clock rather than its
// own (avoids missing/duplicating orders from client clock drift).
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const since = request.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(since) : new Date();
  if (Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json({ error: "Invalid since parameter" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: { createdAt: { gt: sinceDate } },
    orderBy: { createdAt: "asc" },
    select: { id: true, orderNumber: true, customerName: true, total: true, createdAt: true },
    take: 20, // sane cap — a flood of orders in one poll window is not the common case
  });

  return NextResponse.json({ orders, serverTime: new Date().toISOString() });
}
