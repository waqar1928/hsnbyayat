import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { getSetting, SETTING_KEYS, type BrandSettings } from "@/lib/settings";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

// getAdminSession() uses cookies() internally, which normally forces
// dynamic rendering on its own — explicit here anyway for certainty (see
// src/app/(storefront)/page.tsx for why relying on implicit behavior alone
// isn't a safe bet for keeping this out of `next build`).
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");
  const brand = await getSetting<BrandSettings>(SETTING_KEYS.BRAND);
  return <AdminLoginForm brandName={brand.name} logoUrl={brand.logoUrl} />;
}
