import BrandWordmark from "./BrandWordmark";

// Renders the uploaded logo image (Settings → Content → Brand) when one has
// been set, falling back to the text BrandWordmark otherwise — the same
// "real photo, else drawn fallback" pattern used for product images.
export default function BrandMark({ logoUrl, alt }: { logoUrl?: string | null; alt: string }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={alt} className="brand-logo-img" />;
  }
  return <BrandWordmark />;
}
