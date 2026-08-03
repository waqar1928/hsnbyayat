import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newsletterSubscribeSchema } from "@/lib/validation/auth";
import { jsonError, zodErrorResponse } from "@/lib/apiError";
import { rateLimit, clientKeyFromRequest } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(`newsletter:${clientKeyFromRequest(request)}`, 5, 60_000);
  if (!limited.allowed) return jsonError("Too many requests, please try again shortly", 429);

  const body = await request.json().catch(() => null);
  const parsed = newsletterSubscribeSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  await prisma.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    create: { email: parsed.data.email },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
