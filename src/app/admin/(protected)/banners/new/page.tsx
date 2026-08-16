import AdminTopbar from "@/components/admin/AdminTopbar";
import BannerForm from "@/components/admin/BannerForm";

export default function NewBannerPage() {
  return (
    <>
      <AdminTopbar title="New banner" />
      <BannerForm />
    </>
  );
}
