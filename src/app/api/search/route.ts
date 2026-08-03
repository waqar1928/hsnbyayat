import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/queries";

// GET /api/search?q= — powers the debounced live search panel.

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const items = await searchProducts(q);
  return NextResponse.json({ items });
}
