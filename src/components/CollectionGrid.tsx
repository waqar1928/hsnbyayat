import type { ProductCardDTO } from "@/lib/types";
import ProductCard from "./ProductCard";
import SortSelect from "./SortSelect";
import Pagination from "./Pagination";
import { buildHref } from "@/lib/url";

export default function CollectionGrid({
  items,
  total,
  page,
  totalPages,
  sort,
  title,
  crumb,
  basePath,
  currentParams,
  headingTag = "h2",
}: {
  items: ProductCardDTO[];
  total: number;
  page: number;
  totalPages: number;
  sort: string;
  title: string;
  crumb: string;
  basePath: string;
  currentParams: Record<string, string | undefined>;
  headingTag?: "h1" | "h2";
}) {
  const Heading = headingTag;
  return (
    <>
      <div className="section-head">
        <Heading>{title}</Heading>
      </div>
      <div className="collection-bar">
        <div>
          <div className="crumb">{crumb}</div>
          <div className="result-count">{total} products</div>
        </div>
        <SortSelect sort={sort} />
      </div>
      <div className="grid">
        {items.length ? (
          items.map((p) => <ProductCard key={p.id} product={p} />)
        ) : (
          <div className="sr-empty" style={{ gridColumn: "1/-1" }}>
            Nothing here yet — check back soon
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} buildHref={(p) => buildHref(basePath, currentParams, { page: p === 1 ? undefined : p })} />
    </>
  );
}
