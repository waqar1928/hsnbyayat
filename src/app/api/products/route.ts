import { NextRequest, NextResponse } from "next/server";
import { getProductList } from "@/lib/queries";

// GET /api/products — public collection listing with filter/sort/pagination.
// Query params: group (category slug), sub (subcategory slug), sale=true,
// salePct, badge, bestSeller=true, sort=featured|price-asc|price-desc|name,
// page, pageSize

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const result = await getProductList({
    categorySlug: sp.get("group"),
    subSlug: sp.get("sub"),
    sale: sp.get("sale") === "true",
    salePct: sp.get("salePct") ? Number(sp.get("salePct")) : null,
    badge: sp.get("badge"),
    bestSeller: sp.get("bestSeller") === "true",
    sort: sp.get("sort"),
    page: Number(sp.get("page")) || 1,
    pageSize: Number(sp.get("pageSize")) || 24,
  });
  return NextResponse.json(result);
}
