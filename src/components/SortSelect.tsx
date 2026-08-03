"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function SortSelect({ sort }: { sort: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page"); // changing sort resets to page 1
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select className="sort-sel" value={sort} onChange={(e) => onChange(e.target.value)} aria-label="Sort products">
      <option value="featured">Sort: Featured</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
      <option value="name">Name: A–Z</option>
    </select>
  );
}
