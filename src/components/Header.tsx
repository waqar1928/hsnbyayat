"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/lib/cartStore";
import { useUIStore } from "@/lib/uiStore";
import type { CollectionsTreeDTO } from "@/lib/types";
import BrandMark from "./BrandMark";

export default function Header({
  brandName,
  logoUrl,
  collections,
}: {
  brandName: string;
  logoUrl: string | null;
  collections: CollectionsTreeDTO;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const cartCount = useCartStore((s) => s.items.reduce((t, i) => t + i.qty, 0));
  const { mobileNavOpen, toggleMobileNav, closeMobileNav, openCart, openSearch } = useUIStore();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!navRef.current?.contains(e.target as Node)) setOpenIdx(null);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <header>
      <div className="header-inner">
        <button className="icon-btn menu-toggle" onClick={toggleMobileNav} aria-label="Menu">
          ☰
        </button>
        <Link className="logo" href="/" onClick={closeMobileNav} aria-label={brandName}>
          <BrandMark logoUrl={logoUrl} alt={brandName} />
        </Link>
        <nav className={`main-nav ${mobileNavOpen ? "open" : ""}`} aria-label="Main navigation" ref={navRef}>
          <div className="nav-item">
            <Link className="nav-link" href="/shop" onClick={closeMobileNav}>
              Shop All
            </Link>
          </div>
          {collections.categories.map((cat, i) => (
            <div className={`nav-item ${openIdx === i ? "open" : ""}`} key={cat.groupSlug}>
              <button className="nav-link" onClick={() => setOpenIdx(openIdx === i ? null : i)} aria-haspopup="true">
                {cat.group} <span style={{ fontSize: ".6rem" }}>▾</span>
              </button>
              <div className="mega">
                <div className="mega-head">{cat.group}</div>
                {cat.subcategories.map((s) => (
                  <Link
                    key={s.subcategorySlug}
                    href={`/shop?group=${encodeURIComponent(cat.groupSlug)}&sub=${encodeURIComponent(s.subcategorySlug)}`}
                    onClick={() => {
                      setOpenIdx(null);
                      closeMobileNav();
                    }}
                  >
                    {s.subcategory}
                  </Link>
                ))}
                <Link
                  href={`/shop?group=${encodeURIComponent(cat.groupSlug)}`}
                  onClick={() => {
                    setOpenIdx(null);
                    closeMobileNav();
                  }}
                >
                  View all {cat.group.toLowerCase()}
                </Link>
              </div>
            </div>
          ))}
          <div className={`nav-item ${openIdx === -1 ? "open" : ""}`}>
            <button
              className="nav-link sale-link"
              onClick={() => setOpenIdx(openIdx === -1 ? null : -1)}
              aria-haspopup="true"
            >
              Sale&apos;26 <span style={{ fontSize: ".6rem" }}>▾</span>
            </button>
            <div className="mega">
              <div className="mega-head">Shop by discount</div>
              {collections.sale.byPct.map((b) => (
                <Link
                  key={b.salePct}
                  href={`/shop?salePct=${b.salePct}`}
                  onClick={() => {
                    setOpenIdx(null);
                    closeMobileNav();
                  }}
                >
                  Flat {b.salePct}% off
                </Link>
              ))}
              <div className="mega-head">Everything</div>
              <Link
                href="/shop?sale=true"
                onClick={() => {
                  setOpenIdx(null);
                  closeMobileNav();
                }}
              >
                View all sale
              </Link>
            </div>
          </div>
        </nav>
        <div className="header-actions">
          <button className="icon-btn" onClick={openSearch} aria-label="Search">
            Search
          </button>
          <Link className="icon-btn" href="/track">
            Track
          </Link>
          <button className="cart-btn" onClick={openCart} aria-label="Open cart">
            Cart <span className="cart-count">{cartCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
