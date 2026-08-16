import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminTopbar from "@/components/admin/AdminTopbar";
import BannerForm, { type BannerFormValue } from "@/components/admin/BannerForm";

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time —
// toISOString() would silently shift the displayed time by the server's UTC
// offset, so this formats from the Date's own local getters instead.
function toDatetimeLocal(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) notFound();

  const initial: BannerFormValue = {
    id: banner.id,
    heading: banner.heading,
    description: banner.description || "",
    ctaText: banner.ctaText || "",
    ctaUrl: banner.ctaUrl || "",
    desktopImageUrl: banner.desktopImageUrl,
    mobileImageUrl: banner.mobileImageUrl || "",
    isActive: banner.isActive,
    startsAt: toDatetimeLocal(banner.startsAt),
    endsAt: toDatetimeLocal(banner.endsAt),
  };

  return (
    <>
      <AdminTopbar title={banner.heading} />
      <BannerForm initial={initial} />
    </>
  );
}
