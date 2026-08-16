"use client";

import { useEffect, useState } from "react";

export type BannerDTO = {
  id: string;
  heading: string;
  description: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  desktopImageUrl: string;
  mobileImageUrl: string | null;
};

// Plain <img> (not next/image) — banner dimensions vary per-campaign, and
// this rotates automatically so every slide would need `priority` handling
// anyway; simplicity wins here over the marginal optimization next/image
// would add for images that aren't all shown at once.
export default function BannerCarousel({ banners }: { banners: BannerDTO[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="banner-carousel">
      {banners.map((b, i) => (
        <div className={`banner-slide ${i === active ? "active" : ""}`} key={b.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="banner-slide-desktop" src={b.desktopImageUrl} alt={b.heading} loading={i === 0 ? "eager" : "lazy"} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="banner-slide-mobile"
            src={b.mobileImageUrl || b.desktopImageUrl}
            alt={b.heading}
            loading={i === 0 ? "eager" : "lazy"}
          />
          <div className="banner-content">
            <h2 className="banner-heading">{b.heading}</h2>
            {b.description && <p className="banner-desc">{b.description}</p>}
            {b.ctaText && b.ctaUrl && (
              <a className="banner-cta" href={b.ctaUrl}>
                {b.ctaText}
              </a>
            )}
          </div>
        </div>
      ))}
      {banners.length > 1 && (
        <div className="banner-dots">
          {banners.map((b, i) => (
            <button
              key={b.id}
              className={`banner-dot ${i === active ? "active" : ""}`}
              aria-label={`Show banner ${i + 1}`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
