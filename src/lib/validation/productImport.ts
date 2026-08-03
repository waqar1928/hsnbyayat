import { z } from "zod";

// One row = one product. Sizes/stock are encoded as "SIZE:QTY;SIZE:QTY" in a
// single cell (e.g. "S:10;M:5;L:0") so the whole thing fits a normal
// spreadsheet without needing multiple rows per product.
export const importRowSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().min(1).max(4000),
  category: z.string().trim().min(1).max(60),
  subcategory: z.string().trim().min(1).max(60),
  price: z.coerce.number().int().positive(),
  salePrice: z.coerce.number().int().positive().optional(),
  badge: z.enum(["New", "BestSeller", ""]).optional(),
  isBestSeller: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sizes: z.array(z.object({ size: z.string().min(1).max(30), stockQty: z.number().int().min(0) })).min(1),
});

export type ImportRow = z.infer<typeof importRowSchema>;

export const IMPORT_HEADERS = [
  "Name",
  "Slug",
  "Description",
  "Category",
  "Subcategory",
  "Price (PKR)",
  "Sale Price (PKR)",
  "Badge",
  "Best Seller",
  "Active",
  "Sizes (e.g. S:10;M:5;L:0)",
] as const;

function parseBool(v: unknown, fallback: boolean): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "") return fallback;
  return ["yes", "y", "true", "1"].includes(s);
}

function parseBadge(v: unknown): "New" | "BestSeller" | "" {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "") return "";
  if (s === "new") return "New";
  if (["bestseller", "best seller", "best-seller"].includes(s)) return "BestSeller";
  return "" as const; // unrecognized value is treated as "no badge" — flagged separately if needed
}

function parseSizes(v: unknown): { size: string; stockQty: number }[] {
  const raw = String(v ?? "").trim();
  if (!raw) return [];
  return raw
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [size, qty] = chunk.split(":").map((s) => s.trim());
      return { size: size || "", stockQty: Number(qty) };
    });
}

/** Converts a raw spreadsheet row (object keyed by header) into the typed shape importRowSchema expects. */
export function coerceImportRow(raw: Record<string, unknown>): unknown {
  return {
    name: String(raw["Name"] ?? "").trim(),
    slug: String(raw["Slug"] ?? "").trim(),
    description: String(raw["Description"] ?? "").trim(),
    category: String(raw["Category"] ?? "").trim(),
    subcategory: String(raw["Subcategory"] ?? "").trim(),
    price: raw["Price (PKR)"],
    salePrice: raw["Sale Price (PKR)"] ? Number(raw["Sale Price (PKR)"]) : undefined,
    badge: parseBadge(raw["Badge"]),
    isBestSeller: parseBool(raw["Best Seller"], false),
    isActive: parseBool(raw["Active"], true),
    sizes: parseSizes(raw["Sizes (e.g. S:10;M:5;L:0)"]),
  };
}
