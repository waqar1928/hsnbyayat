"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { formatPKR } from "@/lib/types";
import { adminFetch } from "@/lib/adminFetch";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  group: string;
  subcategory: string;
  price: number;
  salePrice: number | null;
  salePct: number | null;
  badge: string | null;
  isBestSeller: boolean;
  isActive: boolean;
  totalStock: number;
  image: string | null;
};

type CategoryOption = { id: string; name: string };

export default function AdminProductsPage() {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    adminFetch<{ items: CategoryOption[] }>("/api/admin/categories").then((data) => setCategories(data.items));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    if (active) params.set("active", active);
    params.set("pageSize", "100");
    adminFetch<{ items: ProductRow[]; total: number }>(`/api/admin/products?${params.toString()}`)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [q, categoryId, active]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleActive(p: ProductRow) {
    await adminFetch(`/api/admin/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    load();
  }

  return (
    <>
      <AdminTopbar
        title="Products"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Link className="admin-btn outline" href="/admin/products/import">
              Import CSV/Excel
            </Link>
            <Link className="admin-btn" href="/admin/products/new">
              + New product
            </Link>
          </div>
        }
      />
      <div className="admin-content">
        <div className="admin-panel">
          <div className="table-toolbar">
            <input placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={active} onChange={(e) => setActive(e.target.value)}>
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <span className="result-count">{total} products</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Best seller</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="note" style={{ padding: 20 }}>
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="note" style={{ padding: 20 }}>
                    No products match.
                  </td>
                </tr>
              )}
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link className="row-link" href={`/admin/products/${p.id}`}>
                      {p.name}
                    </Link>
                  </td>
                  <td>
                    {p.group} · {p.subcategory}
                  </td>
                  <td>
                    {p.salePct ? (
                      <>
                        {formatPKR(p.salePrice!)}{" "}
                        <span style={{ textDecoration: "line-through", color: "#8a887e" }}>{formatPKR(p.price)}</span>
                      </>
                    ) : (
                      formatPKR(p.price)
                    )}
                  </td>
                  <td style={{ color: p.totalStock === 0 ? "var(--sale)" : undefined }}>{p.totalStock}</td>
                  <td>{p.isBestSeller ? "Yes" : "—"}</td>
                  <td>
                    <span className={`status-pill ${p.isActive ? "DELIVERED" : "CANCELLED"}`}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button className="admin-btn small outline" onClick={() => toggleActive(p)}>
                      {p.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
