export type ProductCardDTO = {
  id: string;
  slug: string;
  name: string;
  group: string;
  groupSlug: string;
  subcategory: string;
  subcategorySlug: string;
  sizeCount: number;
  price: number;
  salePrice: number | null;
  salePct: number | null;
  badge: string | null;
  placeholderType: string | null;
  placeholderColor: string | null;
  image: { url: string; altText: string | null } | null;
};

export type ProductSizeDTO = {
  variantId: string;
  size: string;
  available: boolean;
  lowStockRemaining: number | null;
};

export type ReviewDTO = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  customerName: string;
  isVerifiedPurchase: boolean;
  createdAt: Date;
};

export type ReviewSummaryDTO = {
  average: number;
  count: number;
  breakdown: { rating: number; count: number }[];
};

export type SizeGuideDTO = {
  id: string;
  name: string;
  description: string | null;
  columns: string[];
  entries: { size: string; values: Record<string, string> }[];
};

export type ProductDetailDTO = {
  id: string;
  slug: string;
  name: string;
  description: string;
  group: string;
  groupSlug: string;
  subcategory: string;
  subcategorySlug: string;
  price: number;
  salePrice: number | null;
  salePct: number | null;
  badge: string | null;
  placeholderType: string | null;
  placeholderColor: string | null;
  images: { url: string; altText: string | null }[];
  sizes: ProductSizeDTO[];
  reviewSummary: ReviewSummaryDTO;
  sizeGuide: SizeGuideDTO | null;
};

export type ProductListResponse = {
  items: ProductCardDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CollectionsTreeDTO = {
  categories: {
    group: string;
    groupSlug: string;
    count: number;
    subcategories: { subcategory: string; subcategorySlug: string; count: number }[];
  }[];
  sale: { count: number; byPct: { salePct: number; count: number }[] };
  newCount: number;
};

export function effectivePrice(p: { price: number; salePrice: number | null; salePct: number | null }): number {
  return p.salePct && p.salePrice ? p.salePrice : p.price;
}

export function formatPKR(amount: number): string {
  return "Rs. " + amount.toLocaleString("en-PK");
}

// A "collection" selector, mirroring the original setCollection(filter) shape.
// group/sub here are slugs (used in /shop query params), not display names.
export type CollectionFilter = {
  group?: string;
  sub?: string;
  salePct?: number;
  badge?: string;
  sale?: boolean;
};

// Mirrors collectionTitle() from the original storefront. Takes display
// names (not slugs) for the sub/group case since it's building a heading.
export function collectionTitle(f: { badge?: string; salePct?: number; sale?: boolean; subName?: string; groupName?: string }): string {
  if (f.badge === "New") return "New arrivals";
  if (f.salePct) return `Flat ${f.salePct}% off`;
  if (f.sale) return "Summer'26 sale";
  if (f.subName) return f.subName;
  if (f.groupName) return f.groupName;
  return "The Collection";
}
