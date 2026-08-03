"use client";

import { useEffect, useState } from "react";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { adminFetch } from "@/lib/adminFetch";

type Subcategory = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  subcategories: Subcategory[];
};

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // `fetchCategories` is the actual data fetch; `load` additionally flips
  // the loading flag back on for the various post-mutation refetches
  // elsewhere in this page. The mount effect calls `fetchCategories`
  // directly — `loading` already starts `true`, so there's nothing to
  // synchronously set there.
  function fetchCategories() {
    return adminFetch<{ items: Category[] }>("/api/admin/categories")
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }
  function load() {
    setLoading(true);
    fetchCategories();
  }
  useEffect(() => {
    fetchCategories();
  }, []);

  async function withErrorHandling(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    await withErrorHandling(async () => {
      await adminFetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      setNewCategoryName("");
      load();
    });
  }

  async function addSubcategory(categoryId: string) {
    if (!newSubName.trim()) return;
    await withErrorHandling(async () => {
      await adminFetch(`/api/admin/categories/${categoryId}/subcategories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubName.trim() }),
      });
      setNewSubName("");
      setAddingSubFor(null);
      load();
    });
  }

  async function toggleCategoryActive(c: Category) {
    await withErrorHandling(async () => {
      await adminFetch(`/api/admin/categories/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      load();
    });
  }

  async function toggleSubActive(s: Subcategory) {
    await withErrorHandling(async () => {
      await adminFetch(`/api/admin/subcategories/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      load();
    });
  }

  async function renameCategory(id: string) {
    if (!editingName.trim()) return;
    await withErrorHandling(async () => {
      await adminFetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      setEditingId(null);
      load();
    });
  }

  async function renameSubcategory(id: string) {
    if (!editingName.trim()) return;
    await withErrorHandling(async () => {
      await adminFetch(`/api/admin/subcategories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      setEditingId(null);
      load();
    });
  }

  async function deleteCategory(c: Category) {
    if (!confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    await withErrorHandling(async () => {
      await adminFetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
      load();
    });
  }

  async function deleteSubcategory(s: Subcategory) {
    if (!confirm(`Delete "${s.name}"? This can't be undone.`)) return;
    await withErrorHandling(async () => {
      await adminFetch(`/api/admin/subcategories/${s.id}`, { method: "DELETE" });
      load();
    });
  }

  async function moveCategory(index: number, dir: -1 | 1) {
    const target = items[index + dir];
    const current = items[index];
    if (!target) return;
    await withErrorHandling(async () => {
      await Promise.all([
        adminFetch(`/api/admin/categories/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: target.sortOrder }),
        }),
        adminFetch(`/api/admin/categories/${target.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: current.sortOrder }),
        }),
      ]);
      load();
    });
  }

  async function moveSubcategory(category: Category, index: number, dir: -1 | 1) {
    const target = category.subcategories[index + dir];
    const current = category.subcategories[index];
    if (!target) return;
    await withErrorHandling(async () => {
      await Promise.all([
        adminFetch(`/api/admin/subcategories/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: target.sortOrder }),
        }),
        adminFetch(`/api/admin/subcategories/${target.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: current.sortOrder }),
        }),
      ]);
      load();
    });
  }

  return (
    <>
      <AdminTopbar title="Categories" />
      <div className="admin-content">
        {error && <div className="admin-error" style={{ marginBottom: 18 }}>{error}</div>}

        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Add a category</h2>
          </div>
          <div className="admin-panel-body">
            <div className="variant-row" style={{ gridTemplateColumns: "1fr auto" }}>
              <input
                placeholder="e.g. Footwear"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
              <button className="admin-btn" onClick={addCategory}>
                + Add category
              </button>
            </div>
          </div>
        </div>

        {loading && <p className="note">Loading…</p>}

        {!loading &&
          items.map((c, i) => (
            <div className="admin-panel" key={c.id}>
              <div className="admin-panel-head">
                {editingId === c.id ? (
                  <div className="variant-row" style={{ gridTemplateColumns: "1fr auto auto", flex: 1, marginBottom: 0 }}>
                    <input value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus />
                    <button className="admin-btn small" onClick={() => renameCategory(c.id)}>
                      Save
                    </button>
                    <button className="admin-btn small outline" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h2>
                    {c.name}{" "}
                    <span className="note" style={{ display: "inline", textTransform: "none" }}>
                      ({c.productCount} product{c.productCount === 1 ? "" : "s"})
                    </span>
                    {!c.isActive && (
                      <span className="status-pill CANCELLED" style={{ marginLeft: 8 }}>
                        Inactive
                      </span>
                    )}
                  </h2>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="admin-btn small outline" disabled={i === 0} onClick={() => moveCategory(i, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button
                    className="admin-btn small outline"
                    disabled={i === items.length - 1}
                    onClick={() => moveCategory(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="admin-btn small outline"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditingName(c.name);
                    }}
                  >
                    Rename
                  </button>
                  <button className="admin-btn small outline" onClick={() => toggleCategoryActive(c)}>
                    {c.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button className="admin-btn small danger" onClick={() => deleteCategory(c)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="admin-panel-body">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subcategory</th>
                      <th>Products</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.subcategories.length === 0 && (
                      <tr>
                        <td colSpan={4} className="note" style={{ padding: 14 }}>
                          No subcategories yet.
                        </td>
                      </tr>
                    )}
                    {c.subcategories.map((s, si) => (
                      <tr key={s.id}>
                        <td>
                          {editingId === s.id ? (
                            <div className="variant-row" style={{ gridTemplateColumns: "1fr auto auto", marginBottom: 0 }}>
                              <input value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus />
                              <button className="admin-btn small" onClick={() => renameSubcategory(s.id)}>
                                Save
                              </button>
                              <button className="admin-btn small outline" onClick={() => setEditingId(null)}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            s.name
                          )}
                        </td>
                        <td>{s.productCount}</td>
                        <td>
                          <span className={`status-pill ${s.isActive ? "DELIVERED" : "CANCELLED"}`}>{s.isActive ? "Active" : "Inactive"}</span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              className="admin-btn small outline"
                              disabled={si === 0}
                              onClick={() => moveSubcategory(c, si, -1)}
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              className="admin-btn small outline"
                              disabled={si === c.subcategories.length - 1}
                              onClick={() => moveSubcategory(c, si, 1)}
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                            <button
                              className="admin-btn small outline"
                              onClick={() => {
                                setEditingId(s.id);
                                setEditingName(s.name);
                              }}
                            >
                              Rename
                            </button>
                            <button className="admin-btn small outline" onClick={() => toggleSubActive(s)}>
                              {s.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button className="admin-btn small danger" onClick={() => deleteSubcategory(s)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {addingSubFor === c.id ? (
                  <div className="variant-row" style={{ gridTemplateColumns: "1fr auto auto", marginTop: 14 }}>
                    <input
                      placeholder="e.g. Sneakers"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSubcategory(c.id)}
                      autoFocus
                    />
                    <button className="admin-btn small" onClick={() => addSubcategory(c.id)}>
                      Add
                    </button>
                    <button
                      className="admin-btn small outline"
                      onClick={() => {
                        setAddingSubFor(null);
                        setNewSubName("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button className="admin-btn small outline" style={{ marginTop: 14 }} onClick={() => setAddingSubFor(c.id)}>
                    + Add subcategory
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </>
  );
}
