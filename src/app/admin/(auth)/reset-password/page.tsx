import type { Metadata } from "next";
import { getSetting, SETTING_KEYS, type BrandSettings } from "@/lib/settings";
import AdminResetPasswordForm from "@/components/admin/AdminResetPasswordForm";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false, follow: false } };

export default async function AdminResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const brand = await getSetting<BrandSettings>(SETTING_KEYS.BRAND);
  return <AdminResetPasswordForm token={token || null} brandName={brand.name} logoUrl={brand.logoUrl} />;
}
