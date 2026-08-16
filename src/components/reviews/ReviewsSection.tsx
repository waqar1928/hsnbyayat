"use client";

import { useEffect, useState } from "react";
import StarRating from "./StarRating";
import CustomerAuthModal from "./CustomerAuthModal";
import type { ReviewDTO, ReviewSummaryDTO } from "@/lib/types";

type Customer = { id: string; name: string } | null;

function formatDate(iso: string | Date) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReviewsSection({
  productId,
  initialSummary,
}: {
  productId: string;
  initialSummary: ReviewSummaryDTO;
}) {
  const [reviews, setReviews] = useState<ReviewDTO[] | null>(null);
  const [summary, setSummary] = useState(initialSummary);
  const [customer, setCustomer] = useState<Customer>(null);
  const [customerChecked, setCustomerChecked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function loadReviews() {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((data: { items: ReviewDTO[] }) => setReviews(data.items));
  }
  function loadSummary() {
    // Cheapest correct way to refresh the aggregate after a moderation
    // change elsewhere: refetch the product's approved reviews and derive
    // it client-side, since there's no public "just the summary" endpoint.
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((data: { items: ReviewDTO[] }) => {
        const count = data.items.length;
        const weighted = data.items.reduce((sum, r) => sum + r.rating, 0);
        const breakdown = [5, 4, 3, 2, 1].map((rating) => ({
          rating,
          count: data.items.filter((r) => r.rating === rating).length,
        }));
        setSummary({ average: count ? Math.round((weighted / count) * 10) / 10 : 0, count, breakdown });
      });
  }

  useEffect(() => {
    loadReviews();
    fetch("/api/customer/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCustomer(data ? { id: data.id, name: data.name } : null))
      .finally(() => setCustomerChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function onWriteReviewClick() {
    if (!customer) {
      setShowAuth(true);
      return;
    }
    setShowForm(true);
  }

  function onAuthenticated() {
    setShowAuth(false);
    fetch("/api/customer/me")
      .then((r) => r.json())
      .then((data) => {
        setCustomer({ id: data.id, name: data.name });
        setShowForm(true);
      });
  }

  return (
    <div className="reviews-section">
      <div className="reviews-summary">
        <div className="reviews-avg">
          <div className="reviews-avg-number">{summary.average || "—"}</div>
          <StarRating value={summary.average} size={22} />
          <div className="note" style={{ marginTop: 4 }}>
            {summary.count} review{summary.count === 1 ? "" : "s"}
          </div>
        </div>
        <div className="reviews-breakdown">
          {summary.breakdown.map((b) => (
            <div className="reviews-breakdown-row" key={b.rating}>
              <span>{b.rating}★</span>
              <div className="reviews-bar">
                <div
                  className="reviews-bar-fill"
                  style={{ width: summary.count ? `${(b.count / summary.count) * 100}%` : "0%" }}
                />
              </div>
              <span className="note">{b.count}</span>
            </div>
          ))}
        </div>
        <button className="admin-btn outline" type="button" onClick={onWriteReviewClick} disabled={!customerChecked}>
          Write a review
        </button>
      </div>

      <div className="reviews-list">
        {reviews === null && <p className="note">Loading reviews…</p>}
        {reviews !== null && reviews.length === 0 && <p className="note">No reviews yet — be the first to write one.</p>}
        {reviews?.map((r) => (
          <div className="review-item" key={r.id}>
            <div className="review-item-head">
              <StarRating value={r.rating} size={15} />
              {r.isVerifiedPurchase && <span className="status-pill DELIVERED">Verified purchase</span>}
            </div>
            {r.title && <div className="review-title">{r.title}</div>}
            <p className="review-body">{r.body}</p>
            <div className="note">
              {r.customerName} · {formatDate(r.createdAt)}
            </div>
          </div>
        ))}
      </div>

      {showAuth && <CustomerAuthModal onClose={() => setShowAuth(false)} onAuthenticated={onAuthenticated} />}
      {showForm && customer && (
        <WriteReviewModal
          productId={productId}
          onClose={() => setShowForm(false)}
          onSubmitted={() => {
            setShowForm(false);
            loadReviews();
            loadSummary();
          }}
        />
      )}
    </div>
  );
}

function WriteReviewModal({
  productId,
  onClose,
  onSubmitted,
}: {
  productId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title: title || undefined, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not submit your review.");
      setMessage(data.message);
      setTimeout(onSubmitted, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal open">
      <div className="modal-box">
        <div className="modal-head">
          <h3>Write a review</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {message ? (
            <p>{message}</p>
          ) : (
            <form onSubmit={submit}>
              {error && <div className="admin-error" style={{ marginBottom: 14 }}>{error}</div>}
              <div className="field">
                <label>Rating</label>
                <StarRating value={rating} onChange={setRating} readOnly={false} size={26} />
              </div>
              <div className="field">
                <label>Title (optional)</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
              </div>
              <div className="field">
                <label>Review</label>
                <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} minLength={10} maxLength={4000} required />
              </div>
              <button className="qv-add" type="submit" disabled={busy} style={{ width: "100%" }}>
                {busy ? "Submitting…" : "Submit review"}
              </button>
              <div className="note" style={{ marginTop: 10 }}>
                Your review is published after a quick moderation check.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
