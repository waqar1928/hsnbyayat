"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { adminFetch } from "@/lib/adminFetch";

type SizeGuideRow = { id: string; name: string; description: string | null; columns: string[] };

export default function AdminSizeGuidesPage() {
  const [items, setItems] = useState<SizeGuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetchGuides is the plain data fetch; load additionally flips loading
  // back on for post-mutation refetches. The mount effect calls
  // fetchGuides directly — loading already starts true, so there's
  // nothing to synchronously set there (mirrors admin/categories).
  function fetchGuides() {
    return adminFetch<{ items: SizeGuideRow[] }>("/api/admin/size-guides")
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }
  function load() {
    setLoading(true);
    fetchGuides();
  }
  useEffect(() => {
    fetchGuides();
  }, []);

  async function remove(guide: SizeGuideRow) {
    if (!confirm(`Delete "${guide.name}"? Any product/category using it will fall back to no size guide.`)) return;
    setError(null);
    try {
      await adminFetch(`/api/admin/size-guides/${guide.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this size guide.");
    }
  }

  return (
    <>
      <AdminTopbar
        title="Size Guides"
        actions={
          <Link href="/admin/size-guides/new" className="admin-btn">
            + New size guide
          </Link>
        }
      />
      <div className="admin-content">
        {error && <div className="admin-error" style={{ marginBottom: 18 }}>{error}</div>}

        {loading && <p className="note">Loading…</p>}
        {!loading && items.length === 0 && (
          <div className="admin-panel">
            <div className="admin-panel-body">
              <p className="note">
                No size guides yet. Create one, then attach it to a product (in the product form) or a category (Admin → Categories).
              </p>
            </div>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="admin-panel">
            <div className="admin-panel-body">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Columns</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((g) => (
                    <tr key={g.id}>
                      <td>{g.name}</td>
                      <td className="note">{g.columns.join(", ")}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <Link href={`/admin/size-guides/${g.id}`} className="admin-btn small outline">
                            Edit
                          </Link>
                          <button className="admin-btn small danger" onClick={() => remove(g)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
