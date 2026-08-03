import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSetting, SETTING_KEYS, type InfoPages } from "@/lib/settings";

const VALID_PAGES = ["shipping", "returns", "faq", "contact", "terms", "privacy"] as const;
type InfoPageKey = (typeof VALID_PAGES)[number];

// Static-shaped content (shipping/returns/FAQ/contact copy) edited rarely
// from the admin panel — a longer revalidate window is safe and cuts DB load.
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  if (!VALID_PAGES.includes(page as InfoPageKey)) return {};
  const infoPages = await getSetting<InfoPages>(SETTING_KEYS.INFO_PAGES);
  return { title: infoPages[page as InfoPageKey].title };
}

export default async function InfoPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!VALID_PAGES.includes(page as InfoPageKey)) notFound();

  const infoPages = await getSetting<InfoPages>(SETTING_KEYS.INFO_PAGES);
  const content = infoPages[page as InfoPageKey];

  return (
    <section className="page-section" style={{ maxWidth: 640 }}>
      <div className="info-card">
        <div className="modal-head">
          <h3>{content.title}</h3>
        </div>
        <div className="modal-body" dangerouslySetInnerHTML={{ __html: content.body }} />
      </div>
    </section>
  );
}
