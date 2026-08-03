import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { unauthorized } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("pageSize")) || 50));

  const [total, subscribers] = await Promise.all([
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ items: subscribers, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}
