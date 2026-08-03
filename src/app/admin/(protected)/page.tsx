"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { formatPKR } from "@/lib/types";
import { adminFetch } from "@/lib/adminFetch";

type DashboardData = {
  today: { orders: number; revenue: number };
  week: { orders: number; revenue: number };
  month: { orders: number; revenue: number };
  ordersByStatus: Record<string, number>;
  lowStock: { variantId: string; sku: string; size: string; stockQty: number; productName: string; productSlug: string }[];
  latestOrders: { id: string; orderNumber: string; customerName: string; status: string; total: number; createdAt: string }[];
};

const STATUS_ORDER = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    adminFetch<DashboardData>("/api/admin/dashboard").then(setData);
  }, []);

  return (
    <>
      <AdminTopbar title="Dashboard" />
      <div className="admin-content">
        {!data ? (
          <p className="note">Loading…</p>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Today</div>
                <div className="stat-value">{data.today.orders}</div>
                <div className="stat-sub">{formatPKR(data.today.revenue)} revenue</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">This week</div>
                <div className="stat-value">{data.week.orders}</div>
                <div className="stat-sub">{formatPKR(data.week.revenue)} revenue</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">This month</div>
                <div className="stat-value">{data.month.orders}</div>
                <div className="stat-sub">{formatPKR(data.month.revenue)} revenue</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Low stock alerts</div>
                <div className="stat-value">{data.lowStock.length}</div>
                <div className="stat-sub">variants under 5 units</div>
              </div>
            </div>

            <div className="admin-form-grid">
              <div className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Latest orders</h2>
                  <Link className="admin-btn small outline" href="/admin/orders">
                    View all
                  </Link>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.latestOrders.length === 0 && (
                      <tr>
                        <td colSpan={4} className="note" style={{ padding: 20 }}>
                          No orders yet.
                        </td>
                      </tr>
                    )}
                    {data.latestOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link className="row-link" href={`/admin/orders/${o.id}`}>
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td>{o.customerName}</td>
                        <td>
                          <span className={`status-pill ${o.status}`}>{o.status}</span>
                        </td>
                        <td>{formatPKR(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Orders by status</h2>
                </div>
                <div className="admin-panel-body">
                  {STATUS_ORDER.map((s) => (
                    <div key={s} className="toggle-row">
                      <span className={`status-pill ${s}`}>{s}</span>
                      <span>{data.ordersByStatus[s] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="admin-panel">
              <div className="admin-panel-head">
                <h2>Low stock alerts</h2>
                <Link className="admin-btn small outline" href="/admin/inventory">
                  Manage inventory
                </Link>
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
                  {data.lowStock.length === 0 && (
                    <tr>
                      <td colSpan={4} className="note" style={{ padding: 20 }}>
                        Nothing low on stock right now.
                      </td>
                    </tr>
                  )}
                  {data.lowStock.map((v) => (
                    <tr key={v.variantId}>
                      <td>{v.productName}</td>
                      <td>{v.size}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>{v.sku}</td>
                      <td style={{ color: v.stockQty === 0 ? "var(--sale)" : undefined, fontWeight: 700 }}>{v.stockQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
