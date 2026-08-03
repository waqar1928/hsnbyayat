"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pctFromPrice } from "@/lib/money";
import { adminFetch } from "@/lib/adminFetch";
import { slugify } from "@/lib/slug";

type VariantRow = { id?: string; size: string; sku: string; stockQty: number };
type ImageRow = { id?: string; url: string; altText: string; sortOrder: number };
type SubcategoryOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; subcategories: SubcategoryOption[] };

export type ProductFormValue = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  price: number;
  salePrice: number | null;
  badge: "" | "New" | "BestSeller";
  isBestSeller: boolean;
  isActive: boolean;
  variants: VariantRow[];
  images: ImageRow[];
};

const EMPTY: ProductFormValue = {
  name: "",
  slug: "",
  description: "",
  categoryId: "",
  subcategoryId: "",
  price: 0,
  salePrice: null,
  badge: "",
  isBestSeller: false,
  isActive: true,
  variants: [{ size: "", sku: "", stockQty: 0 }],
  images: [],
};

export default function ProductForm({ initial }: { initial?: ProductFormValue }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [value, setValue] = useState<ProductFormValue>(initial || EMPTY);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [saleOn, setSaleOn] = useState(!!initial?.salePrice);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dragIdx = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingSubcategory, setAddingSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);

  function loadCategories() {
    adminFetch<{ items: (CategoryOption & { isActive: boolean })[] }>("/api/admin/categories").then((data) =>
      setCategories(data.items.filter((c) => c.isActive).map((c) => ({ ...c, subcategories: c.subcategories })))
    );
  }
  useEffect(loadCategories, []);

  function set<K extends keyof ProductFormValue>(key: K, v: ProductFormValue[K]) {
    setValue((s) => ({ ...s, [key]: v }));
  }

  function onNameChange(name: string) {
    set("name", name);
    if (!slugTouched) set("slug", slugify(name));
  }

  const selectedCategory = categories.find((c) => c.id === value.categoryId);

  function onCategoryChange(categoryId: string) {
    const cat = categories.find((c) => c.id === categoryId);
    setValue((s) => ({ ...s, categoryId, subcategoryId: cat?.subcategories[0]?.id || "" }));
  }

  async function confirmAddCategory() {
    if (!newCategoryName.trim()) return;
    setCategoryBusy(true);
    setError(null);
    try {
      const created = await adminFetch<{ id: string; name: string }>("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      setCategories((prev) => [...prev, { id: created.id, name: created.name, subcategories: [] }]);
      setValue((s) => ({ ...s, categoryId: created.id, subcategoryId: "" }));
      setNewCategoryName("");
      setAddingCategory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create category.");
    } finally {
      setCategoryBusy(false);
    }
  }

  async function confirmAddSubcategory() {
    if (!newSubcategoryName.trim() || !value.categoryId) return;
    setCategoryBusy(true);
    setError(null);
    try {
      const created = await adminFetch<{ id: string; name: string }>(`/api/admin/categories/${value.categoryId}/subcategories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubcategoryName.trim() }),
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === value.categoryId ? { ...c, subcategories: [...c.subcategories, { id: created.id, name: created.name }] } : c))
      );
      set("subcategoryId", created.id);
      setNewSubcategoryName("");
      setAddingSubcategory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create subcategory.");
    } finally {
      setCategoryBusy(false);
    }
  }

  function addVariant() {
    set("variants", [...value.variants, { size: "", sku: "", stockQty: 0 }]);
  }
  function updateVariant(i: number, patch: Partial<VariantRow>) {
    set(
      "variants",
      value.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v))
    );
  }
  function removeVariant(i: number) {
    set(
      "variants",
      value.variants.filter((_, idx) => idx !== i)
    );
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: ImageRow[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        try {
          const data = await adminFetch<{ url: string }>("/api/admin/uploads", { method: "POST", body: form });
          uploaded.push({ url: data.url, altText: value.name, sortOrder: 0 });
        } catch {
          // skip this file (bad type/too large/etc.), keep uploading the rest
        }
      }
      const merged = [...value.images, ...uploaded].map((img, i) => ({ ...img, sortOrder: i }));
      set("images", merged);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(i: number) {
    set(
      "images",
      value.images.filter((_, idx) => idx !== i).map((img, idx) => ({ ...img, sortOrder: idx }))
    );
  }

  function onDragStart(i: number) {
    dragIdx.current = i;
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function onDrop(i: number) {
    const from = dragIdx.current;
    dragIdx.current = null;
    if (from === null || from === i) return;
    const next = [...value.images];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    set(
      "images",
      next.map((img, idx) => ({ ...img, sortOrder: idx }))
    );
  }

  async function save() {
    setError(null);
    if (!value.name.trim() || !value.slug.trim()) {
      setError("Name and slug are required.");
      return;
    }
    if (!value.categoryId || !value.subcategoryId) {
      setError("Choose a category and subcategory.");
      return;
    }
    if (value.variants.some((v) => !v.size.trim() || !v.sku.trim())) {
      setError("Every size row needs a size label and SKU.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: value.name,
        slug: value.slug,
        description: value.description,
        categoryId: value.categoryId,
        subcategoryId: value.subcategoryId,
        price: Number(value.price),
        salePrice: saleOn && value.salePrice ? Number(value.salePrice) : null,
        badge: value.badge || null,
        isBestSeller: value.isBestSeller,
        isActive: value.isActive,
        variants: value.variants.map((v) => ({ id: v.id, size: v.size, sku: v.sku, stockQty: Number(v.stockQty) })),
        images: value.images.map((img) => ({ id: img.id, url: img.url, altText: img.altText, sortOrder: img.sortOrder })),
      };
      const url = isEdit ? `/api/admin/products/${value.id}` : "/api/admin/products";
      await adminFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  const previewPct = saleOn && value.salePrice && value.price ? pctFromPrice(Number(value.price), Number(value.salePrice)) : null;

  return (
    <div className="admin-content">
      {error && <div className="admin-error" style={{ marginBottom: 18 }}>{error}</div>}
      <div className="admin-form-grid">
        <div>
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Details</h2>
            </div>
            <div className="admin-panel-body">
              <div className="field">
                <label>Name</label>
                <input value={value.name} onChange={(e) => onNameChange(e.target.value)} />
              </div>
              <div className="field">
                <label>Slug</label>
                <input
                  value={value.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value);
                  }}
                />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows={4} value={value.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Category</label>
                  {!addingCategory ? (
                    <>
                      <select value={value.categoryId} onChange={(e) => onCategoryChange(e.target.value)}>
                        <option value="">Select…</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="admin-btn small outline" style={{ marginTop: 6 }} onClick={() => setAddingCategory(true)}>
                        + New category
                      </button>
                    </>
                  ) : (
                    <div className="variant-row" style={{ gridTemplateColumns: "1fr auto auto" }}>
                      <input
                        placeholder="New category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                      />
                      <button type="button" className="admin-btn small" disabled={categoryBusy} onClick={confirmAddCategory}>
                        Add
                      </button>
                      <button
                        type="button"
                        className="admin-btn small outline"
                        onClick={() => {
                          setAddingCategory(false);
                          setNewCategoryName("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="field">
                  <label>Subcategory</label>
                  {!addingSubcategory ? (
                    <>
                      <select
                        value={value.subcategoryId}
                        onChange={(e) => set("subcategoryId", e.target.value)}
                        disabled={!value.categoryId}
                      >
                        <option value="">Select…</option>
                        {selectedCategory?.subcategories.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="admin-btn small outline"
                        style={{ marginTop: 6 }}
                        disabled={!value.categoryId}
                        onClick={() => setAddingSubcategory(true)}
                      >
                        + New subcategory
                      </button>
                    </>
                  ) : (
                    <div className="variant-row" style={{ gridTemplateColumns: "1fr auto auto" }}>
                      <input
                        placeholder="New subcategory name"
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        autoFocus
                      />
                      <button type="button" className="admin-btn small" disabled={categoryBusy} onClick={confirmAddSubcategory}>
                        Add
                      </button>
                      <button
                        type="button"
                        className="admin-btn small outline"
                        onClick={() => {
                          setAddingSubcategory(false);
                          setNewSubcategoryName("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="note" style={{ textAlign: "left" }}>
                Need to rename, reorder, or retire a category? Use{" "}
                <a href="/admin/categories" style={{ textDecoration: "underline" }}>
                  Admin → Categories
                </a>
                .
              </div>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Pricing</h2>
            </div>
            <div className="admin-panel-body">
              <div className="form-row">
                <div className="field">
                  <label>Price (PKR)</label>
                  <input type="number" min={0} value={value.price} onChange={(e) => set("price", Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>Badge</label>
                  <select value={value.badge} onChange={(e) => set("badge", e.target.value as ProductFormValue["badge"])}>
                    <option value="">None</option>
                    <option value="New">New</option>
                    <option value="BestSeller">Best seller</option>
                  </select>
                </div>
              </div>
              <div className="toggle-row">
                <span>On sale</span>
                <button
                  type="button"
                  className={`toggle-switch ${saleOn ? "on" : ""}`}
                  onClick={() => setSaleOn((v) => !v)}
                  aria-label="Toggle sale"
                />
              </div>
              {saleOn && (
                <div className="field">
                  <label>Sale price (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={value.salePrice ?? ""}
                    onChange={(e) => set("salePrice", e.target.value ? Number(e.target.value) : null)}
                  />
                  {previewPct !== null && <div className="note" style={{ textAlign: "left", marginTop: 6 }}>Save {previewPct}% off — computed automatically</div>}
                </div>
              )}
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Sizes &amp; stock</h2>
              <button className="admin-btn small outline" type="button" onClick={addVariant}>
                + Add size
              </button>
            </div>
            <div className="admin-panel-body">
              {value.variants.map((v, i) => (
                <div className="variant-row" key={v.id || i}>
                  <input placeholder="Size (e.g. M)" value={v.size} onChange={(e) => updateVariant(i, { size: e.target.value })} />
                  <input placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} />
                  <input
                    type="number"
                    min={0}
                    placeholder="Stock"
                    value={v.stockQty}
                    onChange={(e) => updateVariant(i, { stockQty: Number(e.target.value) })}
                  />
                  <button className="admin-btn small danger" type="button" onClick={() => removeVariant(i)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Images</h2>
            </div>
            <div className="admin-panel-body">
              <label className="image-drop">
                {uploading ? "Uploading…" : "Click to upload photos (JPEG/PNG/WebP, max 8MB each)"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => onFilesSelected(e.target.files)}
                />
              </label>
              {value.images.length === 0 ? (
                <div className="note" style={{ marginTop: 10 }}>
                  No photos yet — the drawn garment placeholder will show on the storefront until you add some.
                </div>
              ) : (
                <div className="image-thumb-grid">
                  {value.images.map((img, i) => (
                    <div
                      key={img.url}
                      className="image-thumb"
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragOver={onDragOver}
                      onDrop={() => onDrop(i)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.altText || value.name} />
                      <button className="rm-btn" type="button" onClick={() => removeImage(i)} aria-label="Remove image">
                        ✕
                      </button>
                      {i === 0 && <div className="primary-tag">Primary</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Status</h2>
            </div>
            <div className="admin-panel-body">
              <div className="toggle-row">
                <span>Active (visible in store)</span>
                <button
                  type="button"
                  className={`toggle-switch ${value.isActive ? "on" : ""}`}
                  onClick={() => set("isActive", !value.isActive)}
                  aria-label="Toggle active"
                />
              </div>
              <div className="toggle-row">
                <span>Best seller carousel</span>
                <button
                  type="button"
                  className={`toggle-switch ${value.isBestSeller ? "on" : ""}`}
                  onClick={() => set("isBestSeller", !value.isBestSeller)}
                  aria-label="Toggle best seller"
                />
              </div>
            </div>
          </div>

          <button className="admin-btn" style={{ width: "100%" }} onClick={save} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </div>
  );
}
