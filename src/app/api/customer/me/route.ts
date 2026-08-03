import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSessionFromRequest } from "@/lib/auth";
import { unauthorized } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  const session = getCustomerSessionFromRequest(request);
  if (!session) return unauthorized();

  const customer = await prisma.customer.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, phone: true, email: true, addresses: true },
  });
  if (!customer) return unauthorized();

  return NextResponse.json(customer);
}
