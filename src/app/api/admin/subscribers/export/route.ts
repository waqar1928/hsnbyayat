import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { unauthorized } from "@/lib/apiError";
import { getBrandSlug } from "@/lib/settings";

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const subscribers = await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } });
  const rows = [["Email", "Subscribed At"], ...subscribers.map((s) => [s.email, s.createdAt.toISOString()])];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const slug = await getBrandSlug();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-subscribers-${Date.now()}.csv"`,
    },
  });
}
