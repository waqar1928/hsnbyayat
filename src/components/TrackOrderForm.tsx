"use client";

import { useState } from "react";
import { formatPKR } from "@/lib/types";

const STEP_ORDER = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];
const STEP_LABEL: Record<string, string> = {
  PENDING: "Order placed",
  CONFIRMED: "Confirmed",
  PACKED: "Being stitched & packed",
  SHIPPED: "Handed to courier",
  DELIVERED: "Out for delivery / delivered",
};

type TrackResult = {
  orderNumber: string;
  status: string;
  city: string;
  paymentMethod: string;
  courierName: string | null;
  trackingCode: string | null;
  subtotal: number;
  shippingFee: number;
  total: number;
  createdAt: string;
  items: { productName: string; size: string; qty: number }[];
};

export default function TrackOrderForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Order not found. Check the number and phone on your confirmation.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const currentIdx = result ? STEP_ORDER.indexOf(result.status) : -1;
  const isTerminalIssue = result && (result.status === "CANCELLED" || result.status === "RETURNED");

  return (
    <div className="track-card">
      <div className="modal-head">
        <h3>Track your order</h3>
      </div>
      <div className="modal-body">
        <div className="field">
          <label htmlFor="trackNo">Order number</label>
          <input
            id="trackNo"
            type="text"
            placeholder="TF-XXXXXX"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="trackPhone">Phone number</label>
          <input
            id="trackPhone"
            type="tel"
            placeholder="03XX-XXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <button className="place-btn" onClick={submit} disabled={loading || !orderNumber || !phone}>
          {loading ? "Searching…" : "Find my order"}
        </button>

        {error && (
          <div className="note" style={{ marginTop: 16, color: "var(--sale)" }}>
            {error}
          </div>
        )}

        {result && (
          <div className="confirm-box" style={{ paddingTop: 22 }}>
            <h3 style={{ fontSize: "1.1rem" }}>Order {result.orderNumber}</h3>
            <p style={{ marginBottom: 12 }}>
              {result.items.map((i) => `${i.qty}× ${i.productName} (${i.size})`).join(", ")} — {formatPKR(result.total)}
            </p>
            {isTerminalIssue ? (
              <div className="track-steps">
                <div className="done">● {result.status === "CANCELLED" ? "Order cancelled" : "Order returned"}</div>
              </div>
            ) : (
              <div className="track-steps">
                {STEP_ORDER.map((step, i) => (
                  <div key={step} className={i <= currentIdx ? "done" : "todo"}>
                    {i <= currentIdx ? "●" : "○"} {STEP_LABEL[step]}
                  </div>
                ))}
              </div>
            )}
            {result.courierName && (
              <p style={{ fontSize: ".8rem" }}>
                Courier: {result.courierName}
                {result.trackingCode ? ` · Tracking: ${result.trackingCode}` : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
