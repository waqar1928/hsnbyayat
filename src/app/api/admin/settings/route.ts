import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { unauthorized, zodErrorResponse } from "@/lib/apiError";
import { getAllPublicSettings, setSetting } from "@/lib/settings";
import { updateSettingsSchema } from "@/lib/validation/settings";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();
  return NextResponse.json(await getAllPublicSettings());
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  await Promise.all(
    Object.entries(parsed.data).map(([key, value]) => setSetting(key, value))
  );

  return NextResponse.json(await getAllPublicSettings());
}
