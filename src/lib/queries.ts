import { prisma } from "@/lib/prisma";
import { Badge } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { getReviewSummary } from "@/lib/reviews";
import { getSizeGuideForProduct } from "@/lib/sizeGuide";

// Shared read-query functions used by both API route handlers (for the
// client-side fetch calls) and Server Components (direct import, no HTTP
// round-trip needed since they run in the same process).

const LOW_STOCK_THRESHOLD = 3;

/** Resolves category/subcategory display names from slugs, for page titles/breadcrumbs. */
export async function getCategoryFilterMeta(categorySlug?: string | null, subSlug?: string | null) {
  let categoryName: string | undefined;
  let subcategoryName: string | undefined;

  if (subSlug) {
    const sub = await prisma.subcategory.findFirst({
      where: { slug: subSlug, ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
      select: { name: true, category: { select: { name: true } } },
    });
    if (sub) {
      subcategoryName = sub.name;
      categoryName = sub.category.name;
    }
  } else if (categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { name: true } });
    categoryName = cat?.name;
  }

  return { categoryName, subcategoryName };
}

export type ProductListFilters = {
  categorySlug?: string | null;
  subSlug?: string | null;
  sale?: boolean;
  salePct?: number | null;
  badge?: string | null;
  bestSeller?: boolean;
  sort?: string | null;
  page?: number;
  pageSize?: number;
};

export async function getProductList(filters: ProductListFilters) {
  const { categorySlug, subSlug, sale, salePct, badge, bestSeller, sort = "featured" } = filters;
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(60, Math.max(1, filters.pageSize || 24));

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (categorySlug) where.category = { slug: categorySlug };
  if (subSlug) where.subcategory = { slug: subSlug };
  if (sale) where.salePct = { not: null };
  if (salePct) where.salePct = salePct;
  if (badge && (Object.values(Badge) as string[]).includes(badge)) {
    where.badge = badge as Badge;
  }
  if (bestSeller) where.isBestSeller = true;

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "price-asc") orderBy = { price: "asc" };
  if (sort === "price-desc") orderBy = { price: "desc" };
  if (sort === "name") orderBy = { name: "asc" };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { name: true, slug: true } },
        subcategory: { select: { name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        _count: { select: { variants: true } },
      },
    }),
  ]);

  return {
    items: products.map(toProductCard),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function toProductCard(p: {
  id: string;
  slug: string;
  name: string;
  category: { name: string; slug: string };
  subcategory: { name: string; slug: string };
  price: number;
  salePrice: number | null;
  salePct: number | null;
  badge: string | null;
  placeholderType: string | null;
  placeholderColor: string | null;
  images: { url: string; altText: string | null }[];
  _count?: { variants: number };
}) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    group: p.category.name,
    groupSlug: p.category.slug,
    subcategory: p.subcategory.name,
    subcategorySlug: p.subcategory.slug,
    sizeCount: p._count?.variants ?? 1,
    price: p.price,
    salePrice: p.salePrice,
    salePct: p.salePct,
    badge: p.badge,
    placeholderType: p.placeholderType,
    placeholderColor: p.placeholderColor,
    image: p.images[0] ? { url: p.images[0].url, altText: p.images[0].altText } : null,
  };
}

export async function getBestSellers(subcategorySlugOrCategorySlug: string) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isBestSeller: true,
      OR: [{ subcategory: { slug: subcategorySlugOrCategorySlug } }, { category: { slug: subcategorySlugOrCategorySlug } }],
    },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      category: { select: { name: true, slug: true } },
      subcategory: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      _count: { select: { variants: true } },
    },
  });
  return products.map(toProductCard);
}

/** Top-level categories, used to drive the Best Sellers tabs dynamically. */
export async function getBestSellerTabs() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true },
  });
  return categories;
}

export async function getCategoryTiles() {
  // One tile per active subcategory (falling back to a generic shape/color
  // when no product in that bucket has a placeholder set), so tiles are
  // fully driven by whatever categories/subcategories actually exist.
  const subcategories = await prisma.subcategory.findMany({
    where: { isActive: true, category: { isActive: true } },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      category: { select: { name: true, slug: true } },
      _count: { select: { products: { where: { isActive: true } } } },
      products: {
        where: { isActive: true },
        take: 1,
        select: { placeholderType: true, placeholderColor: true },
      },
    },
  });

  return subcategories
    .filter((s) => s._count.products > 0)
    .map((s) => ({
      name: s.name,
      group: s.category.slug,
      sub: s.slug,
      count: s._count.products,
      placeholderType: s.products[0]?.placeholderType || "tee",
      placeholderColor: s.products[0]?.placeholderColor || "#9B988E",
    }));
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      subcategory: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { id: "asc" } },
    },
  });
  if (!product || !product.isActive) return null;

  const [reviewSummary, sizeGuide] = await Promise.all([
    getReviewSummary(product.id),
    getSizeGuideForProduct(product.id),
  ]);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    group: product.category.name,
    groupSlug: product.category.slug,
    subcategory: product.subcategory.name,
    subcategorySlug: product.subcategory.slug,
    price: product.price,
    salePrice: product.salePrice,
    salePct: product.salePct,
    badge: product.badge,
    placeholderType: product.placeholderType,
    placeholderColor: product.placeholderColor,
    images: product.images.map((img) => ({ url: img.url, altText: img.altText })),
    sizes: product.variants.map((v) => ({
      variantId: v.id,
      size: v.size,
      available: v.stockQty > 0,
      lowStockRemaining: v.stockQty > 0 && v.stockQty < LOW_STOCK_THRESHOLD ? v.stockQty : null,
    })),
    reviewSummary,
    sizeGuide,
  };
}

/** Active banners for the homepage, respecting the optional start/end window. */
export async function getActiveBanners() {
  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { sortOrder: "asc" },
  });
  return banners.map((b) => ({
    id: b.id,
    heading: b.heading,
    description: b.description,
    ctaText: b.ctaText,
    ctaUrl: b.ctaUrl,
    desktopImageUrl: b.desktopImageUrl,
    mobileImageUrl: b.mobileImageUrl,
  }));
}

export async function getCollectionsTree() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      subcategories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: { where: { isActive: true } } } } },
      },
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { salePct: true, badge: true },
  });

  let saleCount = 0;
  const salePctBuckets = new Map<number, number>();
  let newCount = 0;
  for (const p of products) {
    if (p.salePct) {
      saleCount++;
      salePctBuckets.set(p.salePct, (salePctBuckets.get(p.salePct) || 0) + 1);
    }
    if (p.badge === "New") newCount++;
  }

  return {
    categories: categories
      .filter((c) => c._count.products > 0)
      .map((c) => ({
        group: c.name,
        groupSlug: c.slug,
        count: c._count.products,
        subcategories: c.subcategories
          .filter((s) => s._count.products > 0)
          .map((s) => ({ subcategory: s.name, subcategorySlug: s.slug, count: s._count.products })),
      })),
    sale: {
      count: saleCount,
      byPct: [...salePctBuckets.entries()].map(([salePct, count]) => ({ salePct, count })).sort((a, b) => a.salePct - b.salePct),
    },
    newCount,
  };
}

export async function searchProducts(q: string) {
  const query = q.trim();
  if (!query) return [];

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [{ name: { contains: query } }, { description: { contains: query } }, { subcategory: { name: { contains: query } } }],
    },
    take: 20,
    orderBy: { name: "asc" },
    include: { category: { select: { name: true } }, subcategory: { select: { name: true } } },
  });

  return products.map((p) => ({
    slug: p.slug,
    name: p.name,
    group: p.category.name,
    subcategory: p.subcategory.name,
    price: p.price,
    salePrice: p.salePrice,
    salePct: p.salePct,
  }));
}
