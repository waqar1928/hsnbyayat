import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { unauthorized } from "@/lib/apiError";
import { IMPORT_HEADERS } from "@/lib/validation/productImport";

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// GET /api/admin/products/import/template — downloadable starter CSV.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return unauthorized();

  const example1 = [
    "Boxy Tee — Sand",
    "",
    "Heavyweight 240 GSM combed cotton with a boxy cut and drop shoulder.",
    "Tops",
    "Tees",
    "2450",
    "",
    "New",
    "no",
    "yes",
    "S:12;M:18;L:10;XL:4",
  ];
  const example2 = [
    "Canvas Cap — Olive",
    "canvas-cap-olive",
    "Six-panel cotton twill cap with a brass slider.",
    "Accessories",
    "Caps",
    "1800",
    "1350",
    "",
    "yes",
    "yes",
    "One size:20",
  ];

  const rows = [IMPORT_HEADERS as unknown as string[], example1, example2];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="product-import-template.csv"`,
    },
  });
}
