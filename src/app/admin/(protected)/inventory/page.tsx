"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { adminFetch } from "@/lib/adminFetch";

type VariantRow = {
  id: string;
  sku: string;
  size: string;
  stockQty: number;
  product: { id: string; name: string; slug: string; isActive: boolean };
};

export default function AdminInventoryPage() {
  const [items, setItems] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // `loading` already starts `true`, and this is the only call site for
  // `load` (no manual refresh button on this page), so there's no need to
  // set it again synchronously when the effect runs on mount.
  function load() {
    adminFetch<{ items: VariantRow[] }>("/api/admin/inventory")
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function saveStock(variantId: string, stockQty: number) {
    setSavingId(variantId);
    try {
      await adminFetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, stockQty }),
      });
      setItems((prev) => prev.map((v) => (v.id === variantId ? { ...v, stockQty } : v)));
    } finally {
      setSavingId(null);
    }
  }

  const filtered = q ? items.filter((v) => v.product.name.toLowerCase().includes(q.toLowerCase()) || v.sku.toLowerCase().includes(q.toLowerCase())) : items;

  return (
    <>
      <AdminTopbar title="Inventory" />
      <div className="admin-content">
        <div className="admin-panel">
          <div className="table-toolbar">
            <input placeholder="Search product or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="result-count">{filtered.length} variants · sorted lowest stock first</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Size</th>
                <th>SKU</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="note" style={{ padding: 20 }}>
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link className="row-link" href={`/admin/products/${v.product.id}`}>
                        {v.product.name}
                      </Link>
                      {!v.product.isActive && (
                        <span className="status-pill CANCELLED" style={{ marginLeft: 8 }}>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td>{v.size}</td>
                    <td style={{ fontFamily: "var(--mono)" }}>{v.sku}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        defaultValue={v.stockQty}
                        style={{
                          width: 80,
                          border: "1px solid var(--ink)",
                          padding: "6px 8px",
                          fontFamily: "var(--mono)",
                          color: v.stockQty < 5 ? "var(--sale)" : undefined,
                          fontWeight: v.stockQty < 5 ? 700 : undefined,
                        }}
                        disabled={savingId === v.id}
                        onBlur={(e) => {
                          const n = Number(e.target.value);
                          if (n !== v.stockQty && n >= 0) saveStock(v.id, n);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      />
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
