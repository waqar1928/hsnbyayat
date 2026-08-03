import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/apiError";
import { saveUpload } from "@/lib/storage";
import { processLogoImage } from "@/lib/imageProcessing";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const type = form?.get("type"); // "logo" triggers auto-trim + resize; anything else (product photos) is stored as-is
  if (!file || !(file instanceof File)) return jsonError("No file provided", 400);
  if (!ALLOWED_TYPES.has(file.type)) return jsonError("Unsupported file type", 415);
  if (file.size > MAX_BYTES) return jsonError("File too large (max 8MB)", 413);

  const buffer = Buffer.from(await file.arrayBuffer());

  if (type === "logo") {
    try {
      const { buffer: processed, ext } = await processLogoImage(buffer);
      const stored = await saveUpload(processed, `logo${ext}`, "image/png");
      return NextResponse.json(stored, { status: 201 });
    } catch {
      return jsonError("Could not process that image — try a different file.", 422);
    }
  }

  const stored = await saveUpload(buffer, file.name, file.type);
  return NextResponse.json(stored, { status: 201 });
}
