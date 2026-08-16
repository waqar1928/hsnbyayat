"use client";

import { useEffect, useState } from "react";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { adminFetch } from "@/lib/adminFetch";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isVerifiedPurchase: boolean;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  productSlug: string;
};

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;

export default function AdminReviewsPage() {
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("PENDING");

  // fetchReviews is the plain data fetch; load additionally flips loading
  // back on for the filter-change case. The mount/filter-change effect
  // below calls fetchReviews directly — synchronously calling setLoading
  // from inside an effect body triggers cascading renders, so it's kept
  // out of the function the effect invokes (mirrors admin/categories).
  function fetchReviews() {
    const qs = filter === "ALL" ? "" : `?status=${filter}`;
    return adminFetch<{ items: ReviewRow[] }>(`/api/admin/reviews${qs}`)
      .then((data) => setItems(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load reviews."))
      .finally(() => setLoading(false));
  }
  function load() {
    setLoading(true);
    fetchReviews();
  }
  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function moderate(id: string, status: "APPROVED" | "REJECTED" | "PENDING") {
    try {
      await adminFetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this review.");
    }
  }

  async function remove(review: ReviewRow) {
    if (!confirm(`Delete this review by ${review.customerName}? This can't be undone.`)) return;
    try {
      await adminFetch(`/api/admin/reviews/${review.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this review.");
    }
  }

  return (
    <>
      <AdminTopbar title="Reviews" />
      <div className="admin-content">
        {error && <div className="admin-error" style={{ marginBottom: 18 }}>{error}</div>}

        <div className="admin-panel">
          <div className="admin-panel-body" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`admin-btn small ${filter === f ? "" : "outline"}`}
                onClick={() => setFilter(f)}
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="note">Loading…</p>}
        {!loading && items.length === 0 && (
          <div className="admin-panel">
            <div className="admin-panel-body">
              <p className="note">No reviews in this filter.</p>
            </div>
          </div>
        )}

        {!loading &&
          items.map((r) => (
            <div className="admin-panel" key={r.id}>
              <div className="admin-panel-head">
                <h2>
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}{" "}
                  <span className="note" style={{ display: "inline", textTransform: "none" }}>
                    {r.title ? `“${r.title}”` : ""}
                  </span>
                </h2>
                <span className={`status-pill ${r.status === "APPROVED" ? "DELIVERED" : r.status === "REJECTED" ? "CANCELLED" : "PENDING"}`}>
                  {r.status}
                </span>
              </div>
              <div className="admin-panel-body">
                <p style={{ marginBottom: 10 }}>{r.body}</p>
                <div className="note" style={{ marginBottom: 14 }}>
                  {r.customerName} ({r.customerPhone}) · on{" "}
                  <a href={`/products/${r.productSlug}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                    {r.productName}
                  </a>{" "}
                  · {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {r.isVerifiedPurchase && (
                    <>
                      {" "}
                      · <span className="status-pill DELIVERED">Verified purchase</span>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {r.status !== "APPROVED" && (
                    <button className="admin-btn small" onClick={() => moderate(r.id, "APPROVED")}>
                      Approve
                    </button>
                  )}
                  {r.status !== "REJECTED" && (
                    <button className="admin-btn small outline" onClick={() => moderate(r.id, "REJECTED")}>
                      Reject
                    </button>
                  )}
                  <button className="admin-btn small danger" onClick={() => remove(r)}>
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
