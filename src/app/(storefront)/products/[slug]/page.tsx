import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/queries";
import ProductDetailView from "@/components/ProductDetailView";

// Product pages are the highest-traffic, most performance-sensitive route in
// the storefront (shared links, ads, PDP is the LCP-critical page) and only
// depend on the URL param (no searchParams), so they're a clean fit for ISR:
// served from cache for up to a minute, then silently revalidated in the
// background. Stock display can be up to a minute stale — the real oversell
// guard is the atomic stock check at order-creation time, not this page.
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description || `${product.name} — ${product.group} from HSN BY AYAT.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: product.images[0] ? { images: [{ url: product.images[0].url }] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  // Product structured data — aggregateRating is only included when there's
  // at least one real APPROVED review behind it (getReviewSummary never
  // counts pending/rejected), never a fabricated/placeholder rating.
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((img) => `${siteUrl}${img.url}`),
    sku: `TF-${product.id.slice(-4).toUpperCase()}`,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: "PKR",
      price: product.salePct && product.salePrice ? product.salePrice : product.price,
      availability: product.sizes.some((s) => s.available) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
  if (product.reviewSummary.count > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.reviewSummary.average,
      reviewCount: product.reviewSummary.count,
    };
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="breadcrumb-bar">
        <Link href="/">Home</Link> / <Link href={`/shop?group=${product.groupSlug}`}>{product.group}</Link> / {product.name}
      </div>
      <section className="page-section">
        <ProductDetailView product={product} />
      </section>
    </>
  );
}
