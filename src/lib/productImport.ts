import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { pctFromPrice } from "@/lib/money";
import { importRowSchema, coerceImportRow, type ImportRow } from "@/lib/validation/productImport";

export type ImportRowResult = {
  row: number; // 1-based, excluding header
  name: string;
  action: "create" | "update" | "error";
  categoryAction: "existing" | "new" | null;
  subcategoryAction: "existing" | "new" | null;
  errors: string[];
};

export type ImportSummary = {
  total: number;
  created: number;
  updated: number;
  errors: number;
  newCategories: number;
  newSubcategories: number;
};

const MAX_ROWS = 500;

export function parseSpreadsheet(buffer: Buffer, filename: string): Record<string, unknown>[] {
  // CSV needs to go in as a decoded UTF-8 string — reading it as type:"buffer"
  // makes SheetJS guess the codepage, and it guesses Latin-1/CP1252, mangling
  // any non-ASCII character (em dashes, accents, etc). Binary formats
  // (.xlsx/.xls) are real zip/OLE containers and must stay as a buffer.
  const isCsv = /\.csv$/i.test(filename);
  const workbook = isCsv ? XLSX.read(buffer.toString("utf-8"), { type: "string" }) : XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

/**
 * Processes a parsed spreadsheet: validates every row, resolves categories/
 * subcategories (creating them if they don't exist yet), and — unless
 * dryRun is true — writes products/variants to the database. Category
 * creation always happens for real even during a dry run preview would be
 * confusing otherwise (rows below would see it as "existing"), so instead we
 * track a would-be-created set in memory and never touch the DB when dryRun.
 */
export async function processImport(rows: Record<string, unknown>[], dryRun: boolean) {
  const results: ImportRowResult[] = [];
  const summary: ImportSummary = { total: rows.length, created: 0, updated: 0, errors: 0, newCategories: 0, newSubcategories: 0 };

  if (rows.length > MAX_ROWS) {
    throw new Error(`Too many rows (${rows.length}) — split into batches of ${MAX_ROWS} or fewer.`);
  }

  // Preload existing categories/subcategories into a case-insensitive lookup,
  // then track additions in the same map so later rows in this same import
  // see categories created by earlier rows (whether or not we're dry-running).
  const existingCategories = await prisma.category.findMany({ include: { subcategories: true } });
  const categoryMap = new Map<string, { id: string; subcategories: Map<string, { id: string }> }>();
  for (const c of existingCategories) {
    categoryMap.set(c.name.toLowerCase(), {
      id: c.id,
      subcategories: new Map(c.subcategories.map((s) => [s.name.toLowerCase(), { id: s.id }])),
    });
  }
  const pendingNewCategories = new Set<string>(); // for dry-run "would create" bookkeeping
  const pendingNewSubcategories = new Set<string>();

  let categoryCount = existingCategories.length;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    const coerced = coerceImportRow(rows[i]);
    const parsed = importRowSchema.safeParse(coerced);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      results.push({ row: rowNum, name: String((coerced as Record<string, unknown>).name || "(unnamed)"), action: "error", categoryAction: null, subcategoryAction: null, errors });
      summary.errors++;
      continue;
    }

    const data: ImportRow = parsed.data;
    const rowErrors: string[] = [];

    if (data.sizes.some((s) => !s.size || Number.isNaN(s.stockQty) || s.stockQty < 0)) {
      rowErrors.push('Sizes column has an invalid entry — expected "SIZE:QTY" pairs separated by ";", e.g. S:10;M:5');
    }
    if (data.salePrice && data.salePrice >= data.price) {
      rowErrors.push("Sale price must be lower than the regular price");
    }

    const categoryKey = data.category.toLowerCase();
    let categoryEntry = categoryMap.get(categoryKey);
    const categoryAction: "existing" | "new" = categoryEntry ? "existing" : "new";

    if (!categoryEntry) {
      if (dryRun) {
        pendingNewCategories.add(categoryKey);
        categoryEntry = { id: "(new)", subcategories: new Map() };
      } else {
        const slug = await uniqueCategorySlug(data.category);
        const created = await prisma.category.create({ data: { name: data.category, slug, sortOrder: categoryCount++ } });
        categoryEntry = { id: created.id, subcategories: new Map() };
        summary.newCategories++;
      }
      categoryMap.set(categoryKey, categoryEntry);
    }

    const subKey = data.subcategory.toLowerCase();
    let subEntry = categoryEntry.subcategories.get(subKey);
    const subcategoryAction: "existing" | "new" = subEntry ? "existing" : "new";

    if (!subEntry) {
      if (dryRun) {
        pendingNewSubcategories.add(`${categoryKey}::${subKey}`);
        subEntry = { id: "(new)" };
      } else {
        const slug = await uniqueSubcategorySlug(categoryEntry.id, data.subcategory);
        const maxSort = await prisma.subcategory.aggregate({ where: { categoryId: categoryEntry.id }, _max: { sortOrder: true } });
        const created = await prisma.subcategory.create({
          data: { categoryId: categoryEntry.id, name: data.subcategory, slug, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 },
        });
        subEntry = { id: created.id };
        summary.newSubcategories++;
      }
      categoryEntry.subcategories.set(subKey, subEntry);
    }

    if (rowErrors.length > 0) {
      results.push({ row: rowNum, name: data.name, action: "error", categoryAction, subcategoryAction, errors: rowErrors });
      summary.errors++;
      continue;
    }

    const slug = data.slug || slugify(data.name);
    if (!slug) {
      results.push({ row: rowNum, name: data.name, action: "error", categoryAction, subcategoryAction, errors: ["Could not derive a slug from the name"] });
      summary.errors++;
      continue;
    }

    if (dryRun) {
      const existingProduct = await prisma.product.findUnique({ where: { slug } });
      results.push({
        row: rowNum,
        name: data.name,
        action: existingProduct ? "update" : "create",
        categoryAction,
        subcategoryAction,
        errors: [],
      });
      if (existingProduct) summary.updated++;
      else summary.created++;
      continue;
    }

    try {
      const salePct = data.salePrice ? pctFromPrice(data.price, data.salePrice) : null;
      const existingProduct = await prisma.product.findUnique({ where: { slug }, include: { variants: true } });

      const product = await prisma.product.upsert({
        where: { slug },
        create: {
          name: data.name,
          slug,
          description: data.description,
          categoryId: categoryEntry.id,
          subcategoryId: subEntry.id,
          price: data.price,
          salePrice: data.salePrice ?? null,
          salePct,
          badge: data.badge || null,
          isBestSeller: data.isBestSeller,
          isActive: data.isActive,
        },
        update: {
          name: data.name,
          description: data.description,
          categoryId: categoryEntry.id,
          subcategoryId: subEntry.id,
          price: data.price,
          salePrice: data.salePrice ?? null,
          salePct,
          badge: data.badge || null,
          isBestSeller: data.isBestSeller,
          isActive: data.isActive,
        },
      });

      const existingBySize = new Map((existingProduct?.variants || []).map((v) => [v.size, v]));
      for (const s of data.sizes) {
        const existingVariant = existingBySize.get(s.size);
        if (existingVariant) {
          await prisma.variant.update({ where: { id: existingVariant.id }, data: { stockQty: s.stockQty } });
        } else {
          const sku = `${slug.toUpperCase()}-${s.size.replace(/\s+/g, "").toUpperCase()}`;
          await prisma.variant.create({ data: { productId: product.id, size: s.size, sku, stockQty: s.stockQty } });
        }
      }

      results.push({ row: rowNum, name: data.name, action: existingProduct ? "update" : "create", categoryAction, subcategoryAction, errors: [] });
      if (existingProduct) summary.updated++;
      else summary.created++;
    } catch (err) {
      results.push({
        row: rowNum,
        name: data.name,
        action: "error",
        categoryAction,
        subcategoryAction,
        errors: [err instanceof Error ? err.message : "Unknown error while saving this row"],
      });
      summary.errors++;
    }
  }

  return { results, summary };
}

async function uniqueCategorySlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

async function uniqueSubcategorySlug(categoryId: string, name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (await prisma.subcategory.findUnique({ where: { categoryId_slug: { categoryId, slug } } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}
