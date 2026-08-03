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
    openGraph: product.images[0] ? { images: [{ url: product.images[0].url }] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <div className="breadcrumb-bar">
        <Link href="/">Home</Link> / <Link href={`/shop?group=${product.groupSlug}`}>{product.group}</Link> / {product.name}
      </div>
      <section className="page-section">
        <ProductDetailView product={product} />
      </section>
    </>
  );
}
