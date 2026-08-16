"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { adminFetch } from "@/lib/adminFetch";

type BannerRow = {
  id: string;
  heading: string;
  desktopImageUrl: string;
  isActive: boolean;
  sortOrder: number;
};

export default function AdminBannersPage() {
  const [items, setItems] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetchBanners is the plain data fetch; load additionally flips loading
  // back on for post-mutation refetches. The mount effect calls
  // fetchBanners directly — loading already starts true, so there's
  // nothing to synchronously set there (mirrors admin/categories).
  function fetchBanners() {
    return adminFetch<{ items: BannerRow[] }>("/api/admin/banners")
      .then((data) => setItems(data.items.sort((a, b) => a.sortOrder - b.sortOrder)))
      .finally(() => setLoading(false));
  }
  function load() {
    setLoading(true);
    fetchBanners();
  }
  useEffect(() => {
    fetchBanners();
  }, []);

  async function withErrorHandling(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function toggleActive(b: BannerRow) {
    return withErrorHandling(async () => {
      await adminFetch(`/api/admin/banners/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      load();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = items[index + dir];
    const current = items[index];
    if (!target) return;
    return withErrorHandling(async () => {
      await Promise.all([
        adminFetch(`/api/admin/banners/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: target.sortOrder }),
        }),
        adminFetch(`/api/admin/banners/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: current.sortOrder }),
        }),
      ]);
      load();
    });
  }

  function remove(b: BannerRow) {
    if (!confirm(`Delete "${b.heading}"? This can't be undone.`)) return;
    return withErrorHandling(async () => {
      await adminFetch(`/api/admin/banners/${b.id}`, { method: "DELETE" });
      load();
    });
  }

  return (
    <>
      <AdminTopbar
        title="Banners"
        actions={
          <Link href="/admin/banners/new" className="admin-btn">
            + New banner
          </Link>
        }
      />
      <div className="admin-content">
        {error && <div className="admin-error" style={{ marginBottom: 18 }}>{error}</div>}

        {loading && <p className="note">Loading…</p>}
        {!loading && items.length === 0 && (
          <div className="admin-panel">
            <div className="admin-panel-body">
              <p className="note">No banners yet. Create one to show it on the homepage.</p>
            </div>
          </div>
        )}

        {!loading &&
          items.map((b, i) => (
            <div className="admin-panel" key={b.id}>
              <div className="admin-panel-body banner-admin-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.desktopImageUrl} alt={b.heading} className="banner-admin-thumb" />
                <div>
                  <strong>{b.heading}</strong>{" "}
                  {!b.isActive && (
                    <span className="status-pill CANCELLED" style={{ marginLeft: 6 }}>
                      Inactive
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button className="admin-btn small outline" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button
                    className="admin-btn small outline"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <Link href={`/admin/banners/${b.id}`} className="admin-btn small outline">
                    Edit
                  </Link>
                  <button className="admin-btn small outline" onClick={() => toggleActive(b)}>
                    {b.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button className="admin-btn small danger" onClick={() => remove(b)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}
