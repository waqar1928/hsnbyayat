import type { Metadata } from "next";
import TrackOrderForm from "@/components/TrackOrderForm";

export const metadata: Metadata = { title: "Track your order" };

// This page has no database code of its own, but it's a plain route (no
// [param] segment), so Next attempts to statically prerender it at build
// time by default — which runs the shared (storefront)/layout.tsx wrapping
// it, and that layout unconditionally queries the DB for header/footer
// data. /products/[slug] and /info/[page] don't have this problem: as
// dynamic segments with no generateStaticParams, Next already defers their
// entire render (layout included) to first-request time, so their
// `revalidate` (60s / 300s respectively) already never executes during
// `next build` — nothing to change there. This is the one remaining plain
// storefront route, so it needs the same explicit guard as `/` and `/shop`.
export const dynamic = "force-dynamic";

export default function TrackPage() {
  return (
    <section className="page-section" style={{ maxWidth: 640 }}>
      <TrackOrderForm />
    </section>
  );
}
