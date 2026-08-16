import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { notFound, unauthorized, zodErrorResponse } from "@/lib/apiError";
import { reviewModerationSchema } from "@/lib/validation/review";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/admin/reviews/[id] — approve, reject, or reset a review's
// moderation status. This is the only field an admin can change on a
// review (its content/rating stay exactly as the customer wrote them).
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = reviewModerationSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.productReview.findUnique({ where: { id } });
  if (!existing) return notFound("Review not found");

  const review = await prisma.productReview.update({ where: { id }, data: { status: parsed.data.status } });
  return NextResponse.json({ id: review.id, status: review.status });
}

// DELETE /api/admin/reviews/[id] — permanently removes a review (e.g.
// spam, abuse). No soft-delete here since a rejected-but-visible-to-admin
// state already exists via status: REJECTED for anything worth keeping.
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const { id } = await ctx.params;
  const existing = await prisma.productReview.findUnique({ where: { id } });
  if (!existing) return notFound("Review not found");

  await prisma.productReview.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
