import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerLoginSchema } from "@/lib/validation/customer";
import { jsonError, zodErrorResponse } from "@/lib/apiError";
import { verifyPassword, signCustomerToken, CUSTOMER_COOKIE } from "@/lib/auth";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(`customer-login:${clientKeyFromRequest(request)}`, 10, 60_000);
  if (!limited.allowed) return jsonError("Too many attempts, please try again shortly", 429);

  const body = await request.json().catch(() => null);
  const parsed = customerLoginSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const customer = await prisma.customer.findUnique({ where: { phone: parsed.data.phone } });
  if (!customer || !customer.passwordHash || !(await verifyPassword(parsed.data.password, customer.passwordHash))) {
    return jsonError("Invalid phone number or password", 401);
  }

  const token = signCustomerToken({ sub: customer.id, phone: customer.phone, name: customer.name });
  const res = NextResponse.json({ id: customer.id, name: customer.name, phone: customer.phone });
  res.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
