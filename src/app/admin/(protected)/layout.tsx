import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getSetting, SETTING_KEYS, type BrandSettings } from "@/lib/settings";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminOrderNotifications from "@/components/admin/AdminOrderNotifications";

// Layout-level metadata applies to every page under the protected admin
// area (dashboard, products, orders, ...) unless a page overrides it —
// one place to keep the back office out of search results, on top of the
// /admin disallow rule in robots.ts.
export const metadata: Metadata = {
  title: { default: "Back office", template: "%s — Back office" },
  robots: { index: false, follow: false },
};

// getAdminSession() below uses cookies() internally, which normally forces
// dynamic rendering on its own — explicit here anyway (no downside: unlike
// the storefront's product page, nothing under /admin wants ISR/static
// caching). See src/app/(storefront)/page.tsx for why implicit dynamism
// alone isn't a safe bet for keeping a route out of `next build`.
export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const brand = await getSetting<BrandSettings>(SETTING_KEYS.BRAND);

  return (
    <div className="admin-shell">
      <AdminSidebar adminName={session.name} adminEmail={session.email} brandName={brand.name} logoUrl={brand.logoUrl} />
      <main className="admin-main">{children}</main>
      <AdminOrderNotifications />
    </div>
  );
}
