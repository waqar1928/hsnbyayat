import type { Metadata } from "next";
import { getSetting, SETTING_KEYS, type BrandSettings } from "@/lib/settings";
import AdminForgotPasswordForm from "@/components/admin/AdminForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default async function AdminForgotPasswordPage() {
  const brand = await getSetting<BrandSettings>(SETTING_KEYS.BRAND);
  return <AdminForgotPasswordForm brandName={brand.name} logoUrl={brand.logoUrl} />;
}
