import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerRegisterSchema } from "@/lib/validation/customer";
import { jsonError, zodErrorResponse } from "@/lib/apiError";
import { hashPassword, signCustomerToken, CUSTOMER_COOKIE } from "@/lib/auth";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(`customer-register:${clientKeyFromRequest(request)}`, 10, 60_000);
  if (!limited.allowed) return jsonError("Too many requests, please try again shortly", 429);

  const body = await request.json().catch(() => null);
  const parsed = customerRegisterSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { name, phone, email, password } = parsed.data;

  const existing = await prisma.customer.findUnique({ where: { phone } });
  if (existing) return jsonError("An account with this phone number already exists", 409);

  const passwordHash = await hashPassword(password);
  const customer = await prisma.customer.create({ data: { name, phone, email, passwordHash } });

  const token = signCustomerToken({ sub: customer.id, phone: customer.phone, name: customer.name });
  const res = NextResponse.json({ id: customer.id, name: customer.name, phone: customer.phone }, { status: 201 });
  res.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
