import { getAllPublicSettings } from "@/lib/settings";
import { getCollectionsTree } from "@/lib/queries";
import type { BrandSettings, AnalyticsSettings } from "@/lib/settings";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import QuickViewModal from "@/components/QuickViewModal";
import SearchPanel from "@/components/SearchPanel";
import CheckoutModal from "@/components/CheckoutModal";
import Toast from "@/components/Toast";
import GlobalKeyHandler from "@/components/GlobalKeyHandler";
import CartHydration from "@/components/CartHydration";
import FacebookPixel from "@/components/FacebookPixel";

// Storefront chrome (announcement bar, header, footer, cart/search/checkout
// overlays) lives in this route-group layout so /admin can have its own
// distinct shell without any of this — see src/app/admin/layout.tsx.
export default async function StorefrontLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, collections] = await Promise.all([getAllPublicSettings(), getCollectionsTree()]);

  const brand = settings.brand as BrandSettings;
  const announcements = settings.announcements as string[];
  const shippingFee = settings.shippingFee as number;
  const freeShippingThreshold = settings.freeShippingThreshold as number;
  const analytics = settings.analytics as AnalyticsSettings;
  const whatsappNumber = settings.whatsappNumber as string;

  return (
    <>
      <FacebookPixel pixelId={analytics.facebookPixelId} />
      <GlobalKeyHandler />
      <CartHydration />
      <AnnouncementBar messages={announcements} />
      <Header brandName={brand.name} logoUrl={brand.logoUrl} collections={collections} />
      {children}
      <Newsletter />
      <Footer brand={brand} whatsappNumber={whatsappNumber} year={new Date().getFullYear()} />

      <SearchPanel />
      <CartDrawer shippingFee={shippingFee} freeShippingThreshold={freeShippingThreshold} />
      <QuickViewModal />
      <CheckoutModal shippingFee={shippingFee} freeShippingThreshold={freeShippingThreshold} />
      <Toast />
    </>
  );
}
