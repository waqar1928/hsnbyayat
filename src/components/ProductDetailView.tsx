"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCartStore } from "@/lib/cartStore";
import { useUIStore, useToastStore } from "@/lib/uiStore";
import { effectivePrice, formatPKR, type ProductDetailDTO } from "@/lib/types";
import { trackFbEvent } from "@/lib/fbPixel";
import GarmentPlaceholder from "./GarmentPlaceholder";
import SizeGuideModal from "./SizeGuideModal";
import ReviewsSection from "./reviews/ReviewsSection";
import StarRating from "./reviews/StarRating";

export default function ProductDetailView({ product }: { product: ProductDetailDTO }) {
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0].size : null);
  const [qty, setQty] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useUIStore((s) => s.openCart);
  const show = useToastStore((s) => s.show);

  useEffect(() => {
    trackFbEvent("ViewContent", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: effectivePrice(product),
      currency: "PKR",
    });
    // Fire once per product shown — deliberately not depending on
    // effectivePrice's own inputs beyond product.id, since re-tracking on
    // every price recompute (e.g. a sale toggling) isn't what "viewed this
    // product" means.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const sale = !!product.salePct;
  const selectedSize = product.sizes.find((s) => s.size === size);
  const hasImages = product.images.length > 0;

  function addToCart() {
    if (!size || !selectedSize) return;
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
    show("Added to cart");
    openCart();
  }

  return (
    <div className="pdp">
      <div className="pdp-gallery">
        <div
          className="pdp-main-img"
          style={{ background: `${product.placeholderColor || "#9B988E"}18`, cursor: hasImages ? "zoom-in" : undefined }}
          onClick={() => hasImages && setLightboxOpen(true)}
        >
          {sale ? (
            <span className="badge sale">Save {product.salePct}%</span>
          ) : product.badge ? (
            <span className="badge">{product.badge === "BestSeller" ? "Best seller" : product.badge}</span>
          ) : null}
          {hasImages ? (
            <Image
              // Switching size doesn't remount this component, but activeImg
              // changing the src is enough for next/image to swap the image —
              // key forces a clean crossfade-free swap between differently
              // sized source images rather than stretching the old one.
              key={product.images[activeImg].url}
              src={product.images[activeImg].url}
              alt={product.images[activeImg].altText || product.name}
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
              priority
            />
          ) : (
            <GarmentPlaceholder type={product.placeholderType} color={product.placeholderColor} />
          )}
        </div>
        {hasImages && product.images.length > 1 && (
          <div className="pdp-thumbs">
            {product.images.map((img, i) => (
              <button key={img.url} className={`pdp-thumb ${i === activeImg ? "active" : ""}`} onClick={() => setActiveImg(i)}>
                <Image src={img.url} alt={img.altText || product.name} fill sizes="68px" style={{ objectFit: "cover" }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && hasImages && (
        <div className="lightbox open" onClick={() => setLightboxOpen(false)}>
          <button className="close-btn lightbox-close" aria-label="Close" onClick={() => setLightboxOpen(false)}>
            ✕
          </button>
          <div className="lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
            <Image
              key={product.images[activeImg].url}
              src={product.images[activeImg].url}
              alt={product.images[activeImg].altText || product.name}
              fill
              sizes="100vw"
              style={{ objectFit: "contain" }}
            />
            {product.images.length > 1 && (
              <>
                <button
                  className="lightbox-nav prev"
                  aria-label="Previous image"
                  onClick={() => setActiveImg((i) => (i - 1 + product.images.length) % product.images.length)}
                >
                  ‹
                </button>
                <button
                  className="lightbox-nav next"
                  aria-label="Next image"
                  onClick={() => setActiveImg((i) => (i + 1) % product.images.length)}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="pdp-info">
        <h1>{product.name}</h1>
        <div className="card-meta">
          {product.group} · {product.subcategory} · SKU TF-{product.id.slice(-4).toUpperCase()}
        </div>
        {product.reviewSummary.count > 0 && (
          <a href="#reviews" className="pdp-rating-line">
            <StarRating value={product.reviewSummary.average} size={15} />
            <span className="note">
              {product.reviewSummary.average} ({product.reviewSummary.count} review{product.reviewSummary.count === 1 ? "" : "s"})
            </span>
          </a>
        )}
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
        <div className="pdp-desc">{product.description}</div>

        <div className="pdp-size-head">
          <div className="qv-label" style={{ marginBottom: 0 }}>
            Size
          </div>
          {product.sizeGuide && (
            <button type="button" className="size-guide-link" onClick={() => setSizeGuideOpen(true)}>
              Size Guide
            </button>
          )}
        </div>
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
        {selectedSize?.lowStockRemaining != null && <div className="low-stock">Only {selectedSize.lowStockRemaining} left</div>}

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
        <div className="qv-note">Free shipping over Rs. 5,000 · Cash on delivery · 14-day exchange</div>
      </div>

      {product.sizeGuide && sizeGuideOpen && <SizeGuideModal guide={product.sizeGuide} onClose={() => setSizeGuideOpen(false)} />}

      <div className="pdp-reviews-anchor" id="reviews">
        <h2 className="pdp-section-heading">Reviews</h2>
        <ReviewsSection productId={product.id} initialSummary={product.reviewSummary} />
      </div>
    </div>
  );
}
