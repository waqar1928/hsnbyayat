"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminFetch";

type EntryRow = { size: string; values: Record<string, string> };

export type SizeGuideFormValue = {
  id?: string;
  name: string;
  description: string;
  columns: string[];
  entries: EntryRow[];
};

const EMPTY: SizeGuideFormValue = {
  name: "",
  description: "",
  columns: ["Chest", "Waist", "Length"],
  entries: [],
};

export default function SizeGuideForm({ initial }: { initial?: SizeGuideFormValue }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [value, setValue] = useState<SizeGuideFormValue>(initial || EMPTY);
  const [newColumn, setNewColumn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof SizeGuideFormValue>(key: K, v: SizeGuideFormValue[K]) {
    setValue((s) => ({ ...s, [key]: v }));
  }

  function addColumn() {
    const col = newColumn.trim();
    if (!col || value.columns.includes(col)) return;
    set("columns", [...value.columns, col]);
    setNewColumn("");
  }

  function removeColumn(col: string) {
    set(
      "columns",
      value.columns.filter((c) => c !== col)
    );
    // Drop the now-orphaned values from every entry, rather than leaving
    // dead keys around that the table would never show again.
    set(
      "entries",
      value.entries.map((e) => ({
        ...e,
        values: Object.fromEntries(Object.entries(e.values).filter(([key]) => key !== col)),
      }))
    );
  }

  function addEntry() {
    set("entries", [...value.entries, { size: "", values: {} }]);
  }

  function updateEntrySize(i: number, size: string) {
    set(
      "entries",
      value.entries.map((e, idx) => (idx === i ? { ...e, size } : e))
    );
  }

  function updateEntryValue(i: number, col: string, val: string) {
    set(
      "entries",
      value.entries.map((e, idx) => (idx === i ? { ...e, values: { ...e.values, [col]: val } } : e))
    );
  }

  function removeEntry(i: number) {
    set(
      "entries",
      value.entries.filter((_, idx) => idx !== i)
    );
  }

  async function save() {
    setError(null);
    if (!value.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (value.columns.length === 0) {
      setError("Add at least one measurement column.");
      return;
    }
    if (value.entries.some((e) => !e.size.trim())) {
      setError("Every row needs a size label.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: value.name,
        description: value.description || null,
        columns: value.columns,
        entries: value.entries.map((e, i) => ({ size: e.size, sortOrder: i, values: e.values })),
      };
      const url = isEdit ? `/api/admin/size-guides/${value.id}` : "/api/admin/size-guides";
      await adminFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.push("/admin/size-guides");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this size guide.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-content">
      {error && <div className="admin-error" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>Details</h2>
        </div>
        <div className="admin-panel-body">
          <div className="field">
            <label>Name</label>
            <input value={value.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Women's Tops — General" />
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <textarea rows={2} value={value.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>Measurement columns</h2>
        </div>
        <div className="admin-panel-body">
          <div className="size-guide-columns-row">
            {value.columns.map((col) => (
              <span className="size-guide-col-chip" key={col}>
                {col}
                <button type="button" onClick={() => removeColumn(col)} aria-label={`Remove ${col}`}>
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="variant-row" style={{ gridTemplateColumns: "1fr auto" }}>
            <input
              placeholder="e.g. Sleeve"
              value={newColumn}
              onChange={(e) => setNewColumn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColumn())}
            />
            <button type="button" className="admin-btn small" onClick={addColumn}>
              + Add column
            </button>
          </div>
          <div className="note" style={{ textAlign: "left", marginTop: 6 }}>
            Only add columns your business actually measures — don&apos;t invent values you don&apos;t have.
          </div>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2>Sizes</h2>
          <button type="button" className="admin-btn small outline" onClick={addEntry}>
            + Add row
          </button>
        </div>
        <div className="admin-panel-body">
          {value.entries.length === 0 && <p className="note">No rows yet.</p>}
          {value.entries.map((e, i) => (
            <div
              className="size-guide-entry-row"
              key={i}
              style={{ gridTemplateColumns: `100px repeat(${value.columns.length}, 1fr) auto` }}
            >
              <input placeholder="Size (e.g. M)" value={e.size} onChange={(ev) => updateEntrySize(i, ev.target.value)} />
              {value.columns.map((col) => (
                <input
                  key={col}
                  placeholder={col}
                  value={e.values[col] || ""}
                  onChange={(ev) => updateEntryValue(i, col, ev.target.value)}
                />
              ))}
              <button type="button" className="admin-btn small danger" onClick={() => removeEntry(i)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <button className="admin-btn" onClick={save} disabled={saving}>
        {saving ? "Saving…" : isEdit ? "Save changes" : "Create size guide"}
      </button>
    </div>
  );
}
