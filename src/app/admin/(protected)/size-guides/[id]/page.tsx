import { notFound } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import SizeGuideForm, { type SizeGuideFormValue } from "@/components/admin/SizeGuideForm";
import { getSizeGuideById } from "@/lib/sizeGuide";

export default async function EditSizeGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guide = await getSizeGuideById(id);
  if (!guide) notFound();

  const initial: SizeGuideFormValue = {
    id: guide.id,
    name: guide.name,
    description: guide.description || "",
    columns: guide.columns,
    entries: guide.entries,
  };

  return (
    <>
      <AdminTopbar title={guide.name} />
      <SizeGuideForm initial={initial} />
    </>
  );
}
