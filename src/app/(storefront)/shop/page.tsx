import { getProductList, getCategoryFilterMeta } from "@/lib/queries";
import { collectionTitle } from "@/lib/types";
import CollectionGrid from "@/components/CollectionGrid";
import type { Metadata } from "next";

type SearchParams = {
  group?: string;
  sub?: string;
  sale?: string;
  salePct?: string;
  badge?: string;
  sort?: string;
  page?: string;
};

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const meta = await getCategoryFilterMeta(sp.group, sp.sub);
  const title = collectionTitle({
    badge: sp.badge,
    salePct: sp.salePct ? Number(sp.salePct) : undefined,
    sale: sp.sale === "true",
    subName: meta.subcategoryName,
    groupName: meta.categoryName,
  });
  return { title };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const sale = sp.sale === "true";
  const salePct = sp.salePct ? Number(sp.salePct) : undefined;

  const [result, meta] = await Promise.all([
    getProductList({
      categorySlug: sp.group,
      subSlug: sp.sub,
      sale,
      salePct,
      badge: sp.badge,
      sort: sp.sort,
      page: sp.page ? Number(sp.page) : 1,
    }),
    getCategoryFilterMeta(sp.group, sp.sub),
  ]);

  const title = collectionTitle({
    badge: sp.badge,
    salePct,
    sale,
    subName: meta.subcategoryName,
    groupName: meta.categoryName,
  });

  return (
    <section className="section" id="shop">
      <CollectionGrid
        items={result.items}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        sort={sp.sort || "featured"}
        title={title}
        crumb={`Home / ${title}`}
        basePath="/shop"
        currentParams={sp as Record<string, string | undefined>}
        headingTag="h1"
      />
    </section>
  );
}
