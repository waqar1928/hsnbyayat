import { NextResponse } from "next/server";
import { getAllPublicSettings } from "@/lib/settings";

// GET /api/settings — public storefront content: announcements, hero slides,
// shipping config, bank details (shown post-checkout for bank transfer),
// WhatsApp number, info pages, marquee text, brand info.

export async function GET() {
  const settings = await getAllPublicSettings();
  return NextResponse.json(settings);
}
