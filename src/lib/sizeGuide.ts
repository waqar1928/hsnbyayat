import { prisma } from "@/lib/prisma";

export type SizeGuideEntryDTO = { size: string; values: Record<string, string> };
export type SizeGuideDTO = {
  id: string;
  name: string;
  description: string | null;
  columns: string[];
  entries: SizeGuideEntryDTO[];
};

function parseColumns(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function parseValues(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function toDTO(guide: {
  id: string;
  name: string;
  description: string | null;
  columns: string;
  entries: { size: string; sortOrder: number; values: string }[];
}): SizeGuideDTO {
  return {
    id: guide.id,
    name: guide.name,
    description: guide.description,
    columns: parseColumns(guide.columns),
    entries: [...guide.entries]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((e) => ({ size: e.size, values: parseValues(e.values) })),
  };
}

/**
 * Resolves which size guide (if any) applies to a product: the product's
 * own guide wins if set, otherwise its category's guide, otherwise none —
 * in which case the storefront simply doesn't show a "Size Guide" action.
 * See the sizeGuideId comments on Product/Category in schema.prisma.
 */
export async function getSizeGuideForProduct(productId: string): Promise<SizeGuideDTO | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      sizeGuide: { include: { entries: true } },
      category: { select: { sizeGuide: { include: { entries: true } } } },
    },
  });
  if (!product) return null;
  const guide = product.sizeGuide || product.category.sizeGuide;
  return guide ? toDTO(guide) : null;
}

export async function getAllSizeGuides(): Promise<SizeGuideDTO[]> {
  const guides = await prisma.sizeGuide.findMany({
    orderBy: { name: "asc" },
    include: { entries: true },
  });
  return guides.map(toDTO);
}

export async function getSizeGuideById(id: string): Promise<SizeGuideDTO | null> {
  const guide = await prisma.sizeGuide.findUnique({ where: { id }, include: { entries: true } });
  return guide ? toDTO(guide) : null;
}
