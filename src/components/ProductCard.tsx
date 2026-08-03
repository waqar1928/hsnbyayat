"use client";

import Image from "next/image";
import { useUIStore } from "@/lib/uiStore";
import { effectivePrice, formatPKR, type ProductCardDTO } from "@/lib/types";
import GarmentPlaceholder from "./GarmentPlaceholder";

export default function ProductCard({ product }: { product: ProductCardDTO }) {
  const openQuickView = useUIStore((s) => s.openQuickView);
  const sale = !!product.salePct;
  const open = () => openQuickView(product.slug);

  return (
    <div className="card">
      <div className="card-img" style={{ background: `${product.placeholderColor || "#9B988E"}22` }} onClick={open}>
        {sale ? (
          <span className="badge sale">Save {product.salePct}%</span>
        ) : product.badge ? (
          <span className="badge">{product.badge === "BestSeller" ? "Best seller" : product.badge}</span>
        ) : null}
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.altText || product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <GarmentPlaceholder type={product.placeholderType} color={product.placeholderColor} />
        )}
        <button
          className="quick-btn"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          Quick view
        </button>
      </div>
      <div className="card-body">
        <div>
          <div className="card-name" onClick={open}>
            {product.name}
          </div>
          <div className="card-meta">
            {product.group} · {product.subcategory}
          </div>
        </div>
        <div className="price-line">
          {sale ? (
            <>
              <span className="now discounted">{formatPKR(product.salePrice!)}</span>
              <span className="was">{formatPKR(product.price)}</span>
            </>
          ) : (
            <span className="now">{formatPKR(effectivePrice(product))}</span>
          )}
        </div>
        <button className="add-btn" onClick={open}>
          {product.sizeCount > 1 ? "Choose options" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
