"use client";

import Link from "next/link";
import { useToastStore } from "@/lib/uiStore";
import type { BrandSettings } from "@/lib/settings";

function SocialLink({ label, url }: { label: string; url: string }) {
  const show = useToastStore((s) => s.show);
  if (!url) {
    return (
      <a href="#" onClick={(e) => { e.preventDefault(); show(`Add your ${label} link here`); }}>
        {label}
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

export default function Footer({ brand, year }: { brand: BrandSettings; year: number }) {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <h4>{brand.name}</h4>
          <div className="footer-contact">
            {brand.city}
            <br />
            {brand.email}
            <br />
            {brand.phone}
            <br />
            WhatsApp 11am–8pm
          </div>
        </div>
        <div>
          <h4>Shop</h4>
          <div className="footer-links">
            {/* Category slugs from the seed data — if you rename these in
                Admin → Categories, update the links here (or see README for
                making this settings-driven instead). */}
            <Link href="/shop">All products</Link>
            <Link href="/shop?group=tops">Tops</Link>
            <Link href="/shop?group=bottoms">Bottoms</Link>
            <Link href="/shop?group=accessories">Accessories</Link>
            <Link href="/shop?sale=true">Sale</Link>
          </div>
        </div>
        <div>
          <h4>Customer care</h4>
          <div className="footer-links">
            <Link href="/track">Track your order</Link>
            <Link href="/info/shipping">Shipping</Link>
            <Link href="/info/returns">Returns &amp; exchange</Link>
            <Link href="/info/faq">FAQs</Link>
            <Link href="/info/contact">Contact us</Link>
            <Link href="/info/terms">Terms of service</Link>
            <Link href="/info/privacy">Privacy policy</Link>
          </div>
        </div>
        <div>
          <h4>Follow</h4>
          <div className="footer-links">
            <SocialLink label="Instagram" url={brand.instagram} />
            <SocialLink label="Facebook" url={brand.facebook} />
            <SocialLink label="TikTok" url={brand.tiktok} />
            <SocialLink label="WhatsApp" url="" />
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div>
          © {year} {brand.name} — Cut &amp; sewn in Lahore
        </div>
        <div>Cash on delivery · Bank transfer</div>
      </div>
    </footer>
  );
}
