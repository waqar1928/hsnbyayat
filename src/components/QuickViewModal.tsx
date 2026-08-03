"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUIStore, useToastStore } from "@/lib/uiStore";
import { useCartStore } from "@/lib/cartStore";
import { effectivePrice, formatPKR, type ProductDetailDTO } from "@/lib/types";
import GarmentPlaceholder from "./GarmentPlaceholder";

export default function QuickViewModal() {
  const { quickViewSlug, closeQuickView, openCart } = useUIStore();
  const addItem = useCartStore((s) => s.addItem);
  const show = useToastStore((s) => s.show);

  const [product, setProduct] = useState<ProductDetailDTO | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  // Reset the stale product/size/qty as soon as we notice quickViewSlug has
  // changed (including to null on close) — done during render, React's
  // recommended pattern for "reset state when a prop changes", rather than
  // as a synchronous setState at the top of the effect below.
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  if (quickViewSlug !== loadedSlug) {
    setLoadedSlug(quickViewSlug);
    setProduct(null);
    setSize(null);
    setQty(1);
  }

  useEffect(() => {
    if (!quickViewSlug) return;
    fetch(`/api/products/${quickViewSlug}`)
      .then((r) => r.json())
      .then((data: ProductDetailDTO) => {
        setProduct(data);
        if (data.sizes.length === 1) setSize(data.sizes[0].size);
      });
  }, [quickViewSlug]);

  if (!quickViewSlug) return null;

  const open = !!quickViewSlug;
  const sale = !!product?.salePct;
  const selectedSize = product?.sizes.find((s) => s.size === size);

  function addToCart() {
    if (!product || !size || !selectedSize) return;
    addItem({
      variantId: selectedSize.variantId,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      size,
      unitPrice: effectivePrice(product),
      qty,
      imageUrl: product.images[0]?.url || null,
      placeholderType: product.placeholderType,
      placeholderColor: product.placeholderColor,
      group: product.group,
      subcategory: product.subcategory,
      salePct: product.salePct,
    });
    closeQuickView();
    show("Added to cart");
    openCart();
  }

  return (
    <div className={`modal ${open ? "open" : ""}`}>
      <div className="modal-box wide">
        <div className="modal-head">
          <h3>Quick view</h3>
          <button className="close-btn" onClick={closeQuickView} aria-label="Close quick view">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {!product ? (
            <div className="sr-empty">Loading…</div>
          ) : (
            <div className="qv">
              <div className="qv-img" style={{ background: `${product.placeholderColor || "#9B988E"}18` }}>
                {sale ? (
                  <span className="badge sale">Save {product.salePct}%</span>
                ) : product.badge ? (
                  <span className="badge">{product.badge === "BestSeller" ? "Best seller" : product.badge}</span>
                ) : null}
                {product.images[0] ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.images[0].altText || product.name}
                    fill
                    sizes="(max-width: 900px) 90vw, 420px"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <GarmentPlaceholder type={product.placeholderType} color={product.placeholderColor} />
                )}
              </div>
              <div>
                <h4>{product.name}</h4>
                <div className="card-meta">
                  {product.group} · {product.subcategory}
                </div>
                <div className="price-line">
                  {sale ? (
                    <>
                      <span className="now discounted">{formatPKR(product.salePrice!)}</span>
                      <span className="was">{formatPKR(product.price)}</span>
                      <span className="was" style={{ textDecoration: "none", color: "var(--sale)" }}>
                        Save {product.salePct}%
                      </span>
                    </>
                  ) : (
                    <span className="now">{formatPKR(product.price)}</span>
                  )}
                </div>
                <div className="qv-desc">{product.description}</div>
                <div className="qv-label">Size</div>
                <div className="sizes">
                  {product.sizes.map((s) => (
                    <button
                      key={s.size}
                      className={`size-btn ${size === s.size ? "selected" : ""}`}
                      disabled={!s.available}
                      onClick={() => setSize(s.size)}
                    >
                      {s.size}
                    </button>
                  ))}
                </div>
                {selectedSize?.lowStockRemaining != null && (
                  <div className="low-stock">Only {selectedSize.lowStockRemaining} left</div>
                )}
                <div className="qv-label">Quantity</div>
                <div className="qv-qty">
                  <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                    −
                  </button>
                  <span className="ci-qty">{qty}</span>
                  <button className="qty-btn" onClick={() => setQty((q) => q + 1)} aria-label="Increase">
                    +
                  </button>
                </div>
                <button className="qv-add" disabled={!size} onClick={addToCart}>
                  {size ? `Add to cart — ${formatPKR(effectivePrice(product) * qty)}` : "Select a size"}
                </button>
                <div className="qv-note">
                  Free shipping over Rs. 5,000 · Cash on delivery · 14-day exchange
                  <br />
                  <Link href={`/products/${product.slug}`} onClick={closeQuickView} style={{ textDecoration: "underline" }}>
                    View full details
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
