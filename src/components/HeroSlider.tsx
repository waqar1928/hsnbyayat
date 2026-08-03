"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { HeroSlide } from "@/lib/settings";

function filterToHref(filter: HeroSlide["filter"]): string {
  const params = new URLSearchParams();
  if (filter.group) params.set("group", filter.group);
  if (filter.sub) params.set("sub", filter.sub);
  if (filter.salePct) params.set("salePct", String(filter.salePct));
  if (filter.badge) params.set("badge", filter.badge === "New" ? "New" : filter.badge);
  if (filter.group === "Sale") {
    params.delete("group");
    params.set("sale", "true");
  }
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

export default function HeroSlider({ slides, brandName }: { slides: HeroSlide[]; brandName: string }) {
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  function restart() {
    clearInterval(timer.current);
    timer.current = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6500);
  }

  useEffect(() => {
    restart();
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  function go(i: number) {
    setIdx(i);
    restart();
  }
  function shift(d: number) {
    go((idx + d + slides.length) % slides.length);
  }

  if (!slides.length) return null;

  return (
    <section className="hero" id="home">
      <div className="slides" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {slides.map((s, i) => (
          <div className="slide" key={i}>
            <div className="slide-text">
              <div className="hero-eyebrow">{s.eyebrow}</div>
              <h1 dangerouslySetInnerHTML={{ __html: s.heading }} />
              <p>{s.text}</p>
              <Link className="hero-cta" href={filterToHref(s.filter)}>
                {s.cta}
              </Link>
            </div>
            <div className="slide-visual">
              <div className="hero-tag">
                <div className="tag-brand">{brandName.toUpperCase()}</div>
                {s.tagLines.map((line, j) => (line === "<hr>" ? <hr key={j} /> : <span key={j}>{line}<br /></span>))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hero-dots">
        {slides.map((_, i) => (
          <button key={i} className={`dot ${i === idx ? "active" : ""}`} onClick={() => go(i)} aria-label={`Slide ${i + 1}`} />
        ))}
      </div>
      <div className="hero-arrows">
        <button className="arrow" onClick={() => shift(-1)} aria-label="Previous slide">
          ‹
        </button>
        <button className="arrow" onClick={() => shift(1)} aria-label="Next slide">
          ›
        </button>
      </div>
    </section>
  );
}
