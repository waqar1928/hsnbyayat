import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { unauthorized, zodErrorResponse } from "@/lib/apiError";
import { sizeGuideSchema } from "@/lib/validation/sizeGuide";
import { getAllSizeGuides } from "@/lib/sizeGuide";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const guides = await getAllSizeGuides();
  return NextResponse.json({ items: guides });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = sizeGuideSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  const guide = await prisma.sizeGuide.create({
    data: {
      name: input.name,
      description: input.description || null,
      columns: JSON.stringify(input.columns),
      entries: {
        create: input.entries.map((e, i) => ({
          size: e.size,
          sortOrder: e.sortOrder ?? i,
          values: JSON.stringify(e.values),
        })),
      },
    },
  });

  return NextResponse.json({ id: guide.id }, { status: 201 });
}
