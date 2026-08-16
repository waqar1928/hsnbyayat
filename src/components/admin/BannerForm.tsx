"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminFetch";

export type BannerFormValue = {
  id?: string;
  heading: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  isActive: boolean;
  startsAt: string; // datetime-local value, e.g. "2026-08-16T14:30"
  endsAt: string;
};

const EMPTY: BannerFormValue = {
  heading: "",
  description: "",
  ctaText: "",
  ctaUrl: "",
  desktopImageUrl: "",
  mobileImageUrl: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
};

function toIsoOrNull(datetimeLocal: string): string | null {
  if (!datetimeLocal) return null;
  const d = new Date(datetimeLocal);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function BannerForm({ initial }: { initial?: BannerFormValue }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [value, setValue] = useState<BannerFormValue>(initial || EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);

  function set<K extends keyof BannerFormValue>(key: K, v: BannerFormValue[K]) {
    setValue((s) => ({ ...s, [key]: v }));
  }

  async function upload(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const data = await adminFetch<{ url: string }>("/api/admin/uploads", { method: "POST", body: form });
    return data.url;
  }

  async function onDesktopSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingDesktop(true);
    try {
      set("desktopImageUrl", await upload(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that image.");
    } finally {
      setUploadingDesktop(false);
    }
  }

  async function onMobileSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingMobile(true);
    try {
      set("mobileImageUrl", await upload(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that image.");
    } finally {
      setUploadingMobile(false);
    }
  }

  async function save() {
    setError(null);
    if (!value.heading.trim()) {
      setError("Heading is required.");
      return;
    }
    if (!value.desktopImageUrl) {
      setError("Upload a desktop banner image.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        heading: value.heading,
        description: value.description || null,
        ctaText: value.ctaText || null,
        ctaUrl: value.ctaUrl || null,
        desktopImageUrl: value.desktopImageUrl,
        mobileImageUrl: value.mobileImageUrl || null,
        isActive: value.isActive,
        startsAt: toIsoOrNull(value.startsAt),
        endsAt: toIsoOrNull(value.endsAt),
      };
      const url = isEdit ? `/api/admin/banners/${value.id}` : "/api/admin/banners";
      await adminFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.push("/admin/banners");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this banner.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-content">
      {error && <div className="admin-error" style={{ marginBottom: 18 }}>{error}</div>}

      <div className="admin-form-grid">
        <div>
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Content</h2>
            </div>
            <div className="admin-panel-body">
              <div className="field">
                <label>Heading</label>
                <input value={value.heading} onChange={(e) => set("heading", e.target.value)} placeholder="e.g. Summer Collection" />
              </div>
              <div className="field">
                <label>Short description (optional)</label>
                <textarea rows={2} value={value.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>CTA text (optional)</label>
                  <input value={value.ctaText} onChange={(e) => set("ctaText", e.target.value)} placeholder="Shop now" />
                </div>
                <div className="field">
                  <label>CTA link (optional)</label>
                  <input value={value.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/shop?group=summer" />
                </div>
              </div>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Images</h2>
            </div>
            <div className="admin-panel-body">
              <div className="field">
                <label>Desktop image (recommended ~1920×700)</label>
                {value.desktopImageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={value.desktopImageUrl} alt="Desktop banner preview" className="banner-admin-thumb" style={{ width: 240, height: 88, marginBottom: 8 }} />
                )}
                <label className="image-drop">
                  {uploadingDesktop ? "Uploading…" : value.desktopImageUrl ? "Replace desktop image" : "Click to upload desktop image"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onDesktopSelected(e.target.files)} />
                </label>
              </div>
              <div className="field" style={{ marginTop: 16 }}>
                <label>Mobile image (optional, recommended ~1080×1350 — falls back to desktop image if unset)</label>
                {value.mobileImageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={value.mobileImageUrl} alt="Mobile banner preview" className="banner-admin-thumb" style={{ width: 100, height: 125, marginBottom: 8 }} />
                )}
                <label className="image-drop">
                  {uploadingMobile ? "Uploading…" : value.mobileImageUrl ? "Replace mobile image" : "Click to upload mobile image"}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onMobileSelected(e.target.files)} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Schedule &amp; status</h2>
            </div>
            <div className="admin-panel-body">
              <div className="toggle-row">
                <span>Active</span>
                <button
                  type="button"
                  className={`toggle-switch ${value.isActive ? "on" : ""}`}
                  onClick={() => set("isActive", !value.isActive)}
                  aria-label="Toggle active"
                />
              </div>
              <div className="field">
                <label>Starts (optional)</label>
                <input type="datetime-local" value={value.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </div>
              <div className="field">
                <label>Ends (optional)</label>
                <input type="datetime-local" value={value.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
              </div>
              <div className="note" style={{ textAlign: "left" }}>
                Leave both blank to run indefinitely once active.
              </div>
            </div>
          </div>

          <button className="admin-btn" style={{ width: "100%" }} onClick={save} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create banner"}
          </button>
        </div>
      </div>
    </div>
  );
}
