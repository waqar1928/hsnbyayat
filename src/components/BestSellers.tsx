"use client";

import { useRef, useState, useTransition } from "react";
import type { ProductCardDTO } from "@/lib/types";
import ProductCard from "./ProductCard";

export type BestSellerTab = { name: string; slug: string };

export default function BestSellers({
  tabs,
  initialTabSlug,
  initialItems,
}: {
  tabs: BestSellerTab[];
  initialTabSlug: string;
  initialItems: ProductCardDTO[];
}) {
  const [tabSlug, setTabSlug] = useState(initialTabSlug);
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const carouselRef = useRef<HTMLDivElement>(null);
  const cache = useRef(new Map<string, ProductCardDTO[]>([[initialTabSlug, initialItems]]));

  function selectTab(slug: string) {
    setTabSlug(slug);
    const cached = cache.current.get(slug);
    if (cached) {
      setItems(cached);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/products?bestSeller=true&group=${slug}&pageSize=12`);
      const data = await res.json();
      cache.current.set(slug, data.items);
      setItems(data.items);
    });
  }

  function scrollCarousel(dir: number) {
    carouselRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  }

  if (tabs.length === 0) return null;

  return (
    <section className="section" style={{ paddingTop: 8 }}>
      <div className="section-head">
        <h2>Best sellers</h2>
        <div className="tabs">
          {tabs.map((t) => (
            <button key={t.slug} className={`tab-btn ${t.slug === tabSlug ? "active" : ""}`} onClick={() => selectTab(t.slug)}>
              {t.name}
            </button>
          ))}
        </div>
      </div>
      <div className="carousel-wrap">
        <button className="car-arrow car-prev" onClick={() => scrollCarousel(-1)} aria-label="Scroll left">
          ‹
        </button>
        <div className="carousel" ref={carouselRef} style={{ opacity: isPending ? 0.6 : 1 }}>
          {items.length ? (
            items.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <div className="sr-empty">No best sellers in this category yet</div>
          )}
        </div>
        <button className="car-arrow car-next" onClick={() => scrollCarousel(1)} aria-label="Scroll right">
          ›
        </button>
      </div>
    </section>
  );
}
