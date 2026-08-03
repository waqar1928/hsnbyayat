import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/queries";
import { notFound } from "@/lib/apiError";

export async function GET(_request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const product = await getProductBySlug(slug);
  if (!product) return notFound("Product not found");
  return NextResponse.json(product);
}
