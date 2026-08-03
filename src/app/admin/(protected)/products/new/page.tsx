import AdminTopbar from "@/components/admin/AdminTopbar";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <>
      <AdminTopbar title="New product" />
      <ProductForm />
    </>
  );
}
