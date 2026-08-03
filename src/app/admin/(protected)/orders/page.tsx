"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { formatPKR } from "@/lib/types";
import { adminFetch } from "@/lib/adminFetch";

type OrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  city: string;
  paymentMethod: string;
  status: string;
  total: number;
  itemCount: number;
  createdAt: string;
};

const STATUSES = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

export default function AdminOrdersPage() {
  const [items, setItems] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (city) params.set("city", city);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(page));
    adminFetch<{ items: OrderRow[]; total: number; totalPages: number }>(`/api/admin/orders?${params.toString()}`)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
  }, [q, status, city, paymentMethod, dateFrom, dateTo, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Changing any filter should jump back to page 1 — folded directly into
  // each filter's own change handler (below) rather than a separate effect
  // that watches all six values and fires a second, cascading setState.
  function updateFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    window.open(`/api/admin/orders/export?${params.toString()}`, "_blank");
  }

  return (
    <>
      <AdminTopbar
        title="Orders"
        actions={
          <button className="admin-btn outline" onClick={exportCsv}>
            Export CSV
          </button>
        }
      />
      <div className="admin-content">
        <div className="admin-panel">
          <div className="table-toolbar">
            <input placeholder="Search order # or phone…" value={q} onChange={(e) => updateFilter(setQ, e.target.value)} />
            <select value={status} onChange={(e) => updateFilter(setStatus, e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input placeholder="City" value={city} onChange={(e) => updateFilter(setCity, e.target.value)} style={{ width: 110 }} />
            <select value={paymentMethod} onChange={(e) => updateFilter(setPaymentMethod, e.target.value)}>
              <option value="">All payments</option>
              <option value="COD">Cash on delivery</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => updateFilter(setDateFrom, e.target.value)} />
            <input type="date" value={dateTo} onChange={(e) => updateFilter(setDateTo, e.target.value)} />
            <span className="result-count">{total} orders</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>City</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
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
                    No orders match.
                  </td>
                </tr>
              )}
              {items.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link className="row-link" href={`/admin/orders/${o.id}`}>
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td>
                    {o.customerName}
                    <br />
                    <span style={{ fontFamily: "var(--mono)", fontSize: ".72rem", color: "#6b6a63" }}>{o.phone}</span>
                  </td>
                  <td>{o.city}</td>
                  <td>{o.paymentMethod === "COD" ? "COD" : "Bank"}</td>
                  <td>
                    <span className={`status-pill ${o.status}`}>{o.status}</span>
                  </td>
                  <td>{formatPKR(o.total)}</td>
                  <td>{new Date(o.createdAt).toLocaleDateString("en-PK")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="table-toolbar" style={{ borderBottom: "none", borderTop: "1px dashed var(--line)" }}>
              <button className="admin-btn small outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ‹ Prev
              </button>
              <span className="result-count">
                Page {page} of {totalPages}
              </span>
              <button className="admin-btn small outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next ›
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
