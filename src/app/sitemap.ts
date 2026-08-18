import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Without this, sitemap.xml is a "special Route Handler" Next statically
// prerenders at build time by default — which means `next build` needs a
// live database connection just to finish. That's fine on hosts where the
// build runs somewhere the DB is already reachable (Hostinger), but breaks
// the Docker/VPS path, where the database is only reachable once the
// container is actually running, never during `docker build`. Forcing this
// dynamic makes sitemap.xml render per-request instead — also arguably more
// correct anyway (always reflects the current catalog, never build-stale).
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/track`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteUrl}/shop?group=${encodeURIComponent(c.slug)}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${siteUrl}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
