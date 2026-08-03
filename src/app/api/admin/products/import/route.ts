import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, unauthorized } from "@/lib/apiError";
import { parseSpreadsheet, processImport } from "@/lib/productImport";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

// POST /api/admin/products/import — parses a CSV/XLSX file and either
// previews it (dryRun=true, no DB writes) or commits it (dryRun=false).
// Images are intentionally out of scope here — add photos via the product
// edit page afterward; see README.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const dryRun = form?.get("dryRun") !== "false";

  if (!file || !(file instanceof File)) return jsonError("No file provided", 400);
  if (file.size > MAX_FILE_BYTES) return jsonError("File too large (max 5MB)", 413);

  const allowedExt = /\.(csv|xlsx|xls)$/i;
  if (!allowedExt.test(file.name)) return jsonError("Upload a .csv, .xlsx, or .xls file", 415);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseSpreadsheet(buffer, file.name);
    if (rows.length === 0) return jsonError("The file has no data rows", 400);

    const { results, summary } = await processImport(rows, dryRun);
    return NextResponse.json({ results, summary, dryRun });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not read that file", 400);
  }
}
