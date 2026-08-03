"use client";

import { use, useEffect, useState } from "react";
import AdminTopbar from "@/components/admin/AdminTopbar";
import BrandMark from "@/components/BrandMark";
import { formatPKR } from "@/lib/types";
import { adminFetch } from "@/lib/adminFetch";
import type { BrandSettings } from "@/lib/settings";

type OrderDetail = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  paymentMethod: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  courierName: string | null;
  trackingCode: string | null;
  notes: string | null;
  createdAt: string;
  items: { id: string; productName: string; size: string; unitPrice: number; qty: number }[];
  statusLogs: { id: string; status: string; createdAt: string }[];
  customer: { id: string; name: string; email: string | null } | null;
};

const STATUSES = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandSettings | null>(null);

  function load() {
    adminFetch<OrderDetail>(`/api/admin/orders/${id}`).then((data) => {
      setOrder(data);
      setStatus(data.status);
      setCourierName(data.courierName || "");
      setTrackingCode(data.trackingCode || "");
    });
  }

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setBrand(s.brand));
  }, []);

  useEffect(load, [id]);

  async function saveStatus() {
    setSaving(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, courierName: courierName || undefined, trackingCode: trackingCode || undefined }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order.");
    } finally {
      setSaving(false);
    }
  }

  if (!order) {
    return (
      <>
        <AdminTopbar title="Order" />
        <div className="admin-content">
          <p className="note">Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminTopbar
        title={order.orderNumber}
        actions={
          <button className="admin-btn outline" onClick={() => window.print()}>
            Print packing slip
          </button>
        }
      />
      <div className="admin-content">
        <div className="admin-form-grid">
          <div>
            <div className="admin-panel">
              <div className="admin-panel-head">
                <h2>Items</h2>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.productName}</td>
                      <td>{i.size}</td>
                      <td>{i.qty}</td>
                      <td>{formatPKR(i.unitPrice)}</td>
                      <td>{formatPKR(i.unitPrice * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="admin-panel-body">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{formatPKR(order.subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>{order.shippingFee === 0 ? "Free" : formatPKR(order.shippingFee)}</span>
                </div>
                <div className="summary-row grand">
                  <span>Total</span>
                  <span>{formatPKR(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-head">
                <h2>Customer</h2>
              </div>
              <div className="admin-panel-body" style={{ fontFamily: "var(--mono)", fontSize: ".82rem", lineHeight: 2 }}>
                {order.customerName}
                <br />
                {order.phone}
                <br />
                {order.address}, {order.city}
                <br />
                Payment: {order.paymentMethod === "COD" ? "Cash on delivery" : "Bank transfer"}
                {order.notes && (
                  <>
                    <br />
                    Notes: {order.notes}
                  </>
                )}
              </div>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-head">
                <h2>Status history</h2>
              </div>
              <div className="admin-panel-body">
                <div className="track-steps" style={{ maxWidth: "none" }}>
                  {order.statusLogs.map((log) => (
                    <div key={log.id} className="done">
                      ● {log.status} — {new Date(log.createdAt).toLocaleString("en-PK")}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="admin-panel">
              <div className="admin-panel-head">
                <h2>Update status</h2>
              </div>
              <div className="admin-panel-body">
                {error && <div className="admin-error">{error}</div>}
                <div className="field">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Courier name</label>
                  <input value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="e.g. TCS, Leopards" />
                </div>
                <div className="field">
                  <label>Tracking code</label>
                  <input value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
                </div>
                <button className="admin-btn" style={{ width: "100%" }} onClick={saveStatus} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Print-only packing slip, garment-tag styled */}
        <div className="print-only" style={{ padding: 40 }}>
          <div className="hero-tag" style={{ transform: "none", width: 380 }}>
            <div className="tag-brand">
              <BrandMark logoUrl={brand?.logoUrl ?? null} alt={brand?.name || "HSN BY AYAT"} />
            </div>
            <div>Order {order.orderNumber}</div>
            <div>{new Date(order.createdAt).toLocaleDateString("en-PK")}</div>
            <hr />
            <div>{order.customerName}</div>
            <div>{order.phone}</div>
            <div>{order.address}</div>
            <div>{order.city}</div>
            <hr />
            {order.items.map((i) => (
              <div key={i.id}>
                {i.qty}× {i.productName} ({i.size})
              </div>
            ))}
            <hr />
            <div>Subtotal: {formatPKR(order.subtotal)}</div>
            <div>Shipping: {formatPKR(order.shippingFee)}</div>
            <div>Total: {formatPKR(order.total)}</div>
            <hr />
            <div>Payment: {order.paymentMethod === "COD" ? "Cash on delivery" : "Bank transfer"}</div>
          </div>
        </div>
      </div>
    </>
  );
}
