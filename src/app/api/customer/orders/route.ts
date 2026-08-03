import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSessionFromRequest } from "@/lib/auth";
import { unauthorized } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  const session = getCustomerSessionFromRequest(request);
  if (!session) return unauthorized();

  const orders = await prisma.order.findMany({
    where: { customerId: session.sub },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return NextResponse.json({ items: orders });
}
