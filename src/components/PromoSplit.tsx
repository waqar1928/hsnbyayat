import Link from "next/link";

export default function PromoSplit() {
  return (
    <div className="promo">
      <Link href="/shop?sale=true">
        <span className="promo-tag">Limited time</span>
        <h3>Summer sale — up to 40% off</h3>
        <span className="promo-cta">Shop the sale →</span>
      </Link>
      {/* Points at the "accessories" category slug from the seed data. If you
          rename/remove that category in Admin → Categories, update this link
          (or make it settings-driven — see README). */}
      <Link href="/shop?group=accessories">
        <span className="promo-tag">Complete the fit</span>
        <h3>Caps, totes &amp; socks</h3>
        <span className="promo-cta">Shop accessories →</span>
      </Link>
    </div>
  );
}
