import { NextResponse } from "next/server";
import { getCollectionsTree } from "@/lib/queries";

// GET /api/collections — live category/subcategory tree with product counts,
// used for the mega-menu and the "shop by category" tiles.

export async function GET() {
  return NextResponse.json(await getCollectionsTree());
}
