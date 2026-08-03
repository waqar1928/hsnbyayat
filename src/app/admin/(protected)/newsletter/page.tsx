"use client";

import { useEffect, useState } from "react";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { adminFetch } from "@/lib/adminFetch";

type Subscriber = { id: string; email: string; createdAt: string };

export default function AdminNewsletterPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<{ items: Subscriber[]; total: number }>("/api/admin/subscribers?pageSize=200")
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminTopbar
        title="Newsletter"
        actions={
          <button className="admin-btn outline" onClick={() => window.open("/api/admin/subscribers/export", "_blank")}>
            Export CSV
          </button>
        }
      />
      <div className="admin-content">
        <div className="admin-panel">
          <div className="table-toolbar">
            <span className="result-count">{total} subscribers</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={2} className="note" style={{ padding: 20 }}>
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={2} className="note" style={{ padding: 20 }}>
                    No subscribers yet.
                  </td>
                </tr>
              )}
              {items.map((s) => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td>{new Date(s.createdAt).toLocaleDateString("en-PK")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
