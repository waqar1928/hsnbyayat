import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminTopbar from "@/components/admin/AdminTopbar";
import ProductForm, { type ProductFormValue } from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!product) notFound();

  const initial: ProductFormValue = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId,
    price: product.price,
    salePrice: product.salePrice,
    badge: (product.badge as ProductFormValue["badge"]) || "",
    isBestSeller: product.isBestSeller,
    isActive: product.isActive,
    variants: product.variants.map((v) => ({ id: v.id, size: v.size, sku: v.sku, stockQty: v.stockQty })),
    images: product.images.map((img) => ({ id: img.id, url: img.url, altText: img.altText || "", sortOrder: img.sortOrder })),
  };

  return (
    <>
      <AdminTopbar title={product.name} />
      <ProductForm initial={initial} />
    </>
  );
}
