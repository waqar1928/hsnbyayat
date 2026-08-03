import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { unauthorized } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();
  return NextResponse.json(admin);
}
