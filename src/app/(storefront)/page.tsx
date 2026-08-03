import { getAllPublicSettings } from "@/lib/settings";
import type { HeroSlide, BrandSettings } from "@/lib/settings";
import { getProductList, getBestSellers, getBestSellerTabs, getCategoryTiles } from "@/lib/queries";
import HeroSlider from "@/components/HeroSlider";
import Marquee from "@/components/Marquee";
import CategoryTiles from "@/components/CategoryTiles";
import BestSellers from "@/components/BestSellers";
import PromoSplit from "@/components/PromoSplit";
import CollectionGrid from "@/components/CollectionGrid";

type SearchParams = { sort?: string; page?: string };

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [settings, tiles, bestSellerTabs, collection] = await Promise.all([
    getAllPublicSettings(),
    getCategoryTiles(),
    getBestSellerTabs(),
    getProductList({ sort: sp.sort, page: sp.page ? Number(sp.page) : 1 }),
  ]);

  const initialTabSlug = bestSellerTabs[0]?.slug || "";
  const bestSellers = initialTabSlug ? await getBestSellers(initialTabSlug) : [];

  const heroSlides = settings.heroSlides as HeroSlide[];
  const marqueeText = settings.marqueeText as string;
  const brand = settings.brand as BrandSettings;

  return (
    <>
      <HeroSlider slides={heroSlides} brandName={brand.name} />
      <Marquee text={marqueeText} />
      <CategoryTiles tiles={tiles} />
      <BestSellers
        tabs={bestSellerTabs.map((t) => ({ name: t.name, slug: t.slug }))}
        initialTabSlug={initialTabSlug}
        initialItems={bestSellers}
      />
      <PromoSplit />
      <section className="section" id="shop">
        <CollectionGrid
          items={collection.items}
          total={collection.total}
          page={collection.page}
          totalPages={collection.totalPages}
          sort={sp.sort || "featured"}
          title="The Collection"
          crumb="Home / All"
          basePath="/"
          currentParams={sp as Record<string, string | undefined>}
        />
      </section>
    </>
  );
}
