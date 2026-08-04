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
