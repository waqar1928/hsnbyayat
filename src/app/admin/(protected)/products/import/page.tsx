"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { adminFetch } from "@/lib/adminFetch";

type RowResult = {
  row: number;
  name: string;
  action: "create" | "update" | "error";
  categoryAction: "existing" | "new" | null;
  subcategoryAction: "existing" | "new" | null;
  errors: string[];
};

type Summary = { total: number; created: number; updated: number; errors: number; newCategories: number; newSubcategories: number };

type ImportResponse = { results: RowResult[]; summary: Summary; dryRun: boolean };

export default function AdminProductImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [committed, setCommitted] = useState<ImportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runImport(dryRun: boolean) {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("dryRun", String(dryRun));
      const data = await adminFetch<ImportResponse>("/api/admin/products/import", { method: "POST", body: form });
      if (dryRun) setPreview(data);
      else setCommitted(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that file.");
    } finally {
      setLoading(false);
    }
  }

  function onFileSelected(f: File | null) {
    setFile(f);
    setPreview(null);
    setCommitted(null);
    setError(null);
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setCommitted(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <>
      <AdminTopbar title="Import products" />
      <div className="admin-content">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>1. Get the template</h2>
          </div>
          <div className="admin-panel-body">
            <p className="note" style={{ textAlign: "left", marginBottom: 12 }}>
              One row per product. Sizes and stock go in a single column as{" "}
              <code>SIZE:QTY;SIZE:QTY</code> (e.g. <code>S:10;M:5;L:0</code>). Categories and
              subcategories that don&apos;t exist yet are created automatically. Images aren&apos;t
              part of the import — add photos on each product&apos;s edit page afterward.
            </p>
            {/* Plain <a>, deliberately not next/link: this is a file download
                (the route responds with Content-Disposition: attachment),
                not a page to client-navigate to. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="admin-btn outline" href="/api/admin/products/import/template">
              Download CSV template
            </a>
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>2. Upload your file</h2>
          </div>
          <div className="admin-panel-body">
            {error && <div className="admin-error">{error}</div>}
            <label className="image-drop">
              {file ? file.name : "Click to choose a .csv, .xlsx, or .xls file (max 5MB)"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: "none" }}
                onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
              />
            </label>
            {file && !preview && !committed && (
              <button className="admin-btn" style={{ marginTop: 14 }} onClick={() => runImport(true)} disabled={loading}>
                {loading ? "Checking…" : "Preview import"}
              </button>
            )}
            {file && (preview || committed) && (
              <button className="admin-btn outline" style={{ marginTop: 14 }} onClick={reset}>
                Start over
              </button>
            )}
          </div>
        </div>

        {preview && !committed && (
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>3. Review &amp; confirm</h2>
              <button className="admin-btn" onClick={() => runImport(false)} disabled={loading || preview.summary.errors === preview.summary.total}>
                {loading ? "Importing…" : `Import ${preview.summary.total - preview.summary.errors} row(s)`}
              </button>
            </div>
            <div className="admin-panel-body">
              <div className="stat-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                  <div className="stat-label">Will create</div>
                  <div className="stat-value">{preview.summary.created}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Will update</div>
                  <div className="stat-value">{preview.summary.updated}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Errors</div>
                  <div className="stat-value" style={{ color: preview.summary.errors ? "var(--sale)" : undefined }}>
                    {preview.summary.errors}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">New categories</div>
                  <div className="stat-value">{preview.summary.newCategories + preview.summary.newSubcategories}</div>
                </div>
              </div>
              <ResultsTable results={preview.results} />
              {preview.summary.errors > 0 && (
                <div className="note" style={{ textAlign: "left", marginTop: 14 }}>
                  Rows with errors will be skipped — fix them in your file and re-upload, or import the valid rows now and handle the rest separately.
                </div>
              )}
            </div>
          </div>
        )}

        {committed && (
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Done</h2>
              <button className="admin-btn" onClick={() => router.push("/admin/products")}>
                Go to products
              </button>
            </div>
            <div className="admin-panel-body">
              <div className="stat-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                  <div className="stat-label">Created</div>
                  <div className="stat-value">{committed.summary.created}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Updated</div>
                  <div className="stat-value">{committed.summary.updated}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Errors</div>
                  <div className="stat-value" style={{ color: committed.summary.errors ? "var(--sale)" : undefined }}>
                    {committed.summary.errors}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">New categories</div>
                  <div className="stat-value">{committed.summary.newCategories + committed.summary.newSubcategories}</div>
                </div>
              </div>
              <ResultsTable results={committed.results} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ResultsTable({ results }: { results: RowResult[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Row</th>
          <th>Product</th>
          <th>Action</th>
          <th>Category</th>
          <th>Subcategory</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.row}>
            <td>{r.row}</td>
            <td>{r.name}</td>
            <td>
              <span className={`status-pill ${r.action === "error" ? "CANCELLED" : r.action === "create" ? "DELIVERED" : "CONFIRMED"}`}>
                {r.action}
              </span>
            </td>
            <td>{r.categoryAction === "new" ? <em>new</em> : r.categoryAction || "—"}</td>
            <td>{r.subcategoryAction === "new" ? <em>new</em> : r.subcategoryAction || "—"}</td>
            <td style={{ color: r.errors.length ? "var(--sale)" : undefined, fontSize: ".78rem" }}>
              {r.errors.join("; ")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
