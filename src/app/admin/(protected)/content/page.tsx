"use client";

import { useEffect, useState } from "react";
import AdminTopbar from "@/components/admin/AdminTopbar";
import type { HeroSlide, BankDetails, InfoPages, BrandSettings } from "@/lib/settings";
import { adminFetch } from "@/lib/adminFetch";

type AllSettings = {
  announcements: string[];
  heroSlides: HeroSlide[];
  shippingFee: number;
  freeShippingThreshold: number;
  bankDetails: BankDetails;
  whatsappNumber: string;
  infoPages: InfoPages;
  marqueeText: string;
  brand: BrandSettings;
};

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <button className="admin-btn small" onClick={onClick}>
      {saved ? "Saved ✓" : "Save"}
    </button>
  );
}

export default function AdminContentPage() {
  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    adminFetch<AllSettings>("/api/admin/settings").then(setSettings);
  }, []);

  async function save(key: string, value: unknown) {
    await adminFetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 1800);
  }

  async function uploadLogo(file: File) {
    if (!settings) return;
    setUploadingLogo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "logo"); // triggers server-side auto-trim + resize, see src/lib/imageProcessing.ts
      const data = await adminFetch<{ url: string }>("/api/admin/uploads", { method: "POST", body: form });
      const nextBrand = { ...settings.brand, logoUrl: data.url };
      setSettings({ ...settings, brand: nextBrand });
      await save("brand", nextBrand);
    } catch {
      alert("Could not upload logo — check the file is an image under 8MB.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeLogo() {
    if (!settings) return;
    const nextBrand = { ...settings.brand, logoUrl: null };
    setSettings({ ...settings, brand: nextBrand });
    await save("brand", nextBrand);
  }

  if (!settings) {
    return (
      <>
        <AdminTopbar title="Content" />
        <div className="admin-content">
          <p className="note">Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminTopbar title="Content" />
      <div className="admin-content">
        {/* Brand */}
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Brand &amp; contact</h2>
            <SaveButton saved={savedKey === "brand"} onClick={() => save("brand", settings.brand)} />
          </div>
          <div className="admin-panel-body">
            <div className="field">
              <label>Logo</label>
              {settings.brand.logoUrl ? (
                <div className="image-thumb-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
                  <div className="image-thumb" style={{ cursor: "default" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.brand.logoUrl} alt="Current logo" style={{ objectFit: "contain", background: "var(--paper)" }} />
                    <button className="rm-btn" type="button" onClick={removeLogo} aria-label="Remove logo">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <label className="image-drop">
                  {uploadingLogo
                    ? "Uploading…"
                    : "Click to upload a logo (JPEG/PNG/WebP/GIF, max 8MB) — falls back to the text wordmark if none is set"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                  />
                </label>
              )}
            </div>
            <div className="form-row">
              <div className="field">
                <label>Brand name</label>
                <input
                  value={settings.brand.name}
                  onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, name: e.target.value } })}
                />
              </div>
              <div className="field">
                <label>City</label>
                <input
                  value={settings.brand.city}
                  onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, city: e.target.value } })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Email</label>
                <input
                  value={settings.brand.email}
                  onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, email: e.target.value } })}
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  value={settings.brand.phone}
                  onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, phone: e.target.value } })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Instagram URL</label>
                <input
                  value={settings.brand.instagram}
                  onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, instagram: e.target.value } })}
                />
              </div>
              <div className="field">
                <label>Facebook URL</label>
                <input
                  value={settings.brand.facebook}
                  onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, facebook: e.target.value } })}
                />
              </div>
            </div>
            <div className="field">
              <label>TikTok URL</label>
              <input
                value={settings.brand.tiktok}
                onChange={(e) => setSettings({ ...settings, brand: { ...settings.brand, tiktok: e.target.value } })}
              />
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Announcement bar</h2>
            <SaveButton saved={savedKey === "announcements"} onClick={() => save("announcements", settings.announcements)} />
          </div>
          <div className="admin-panel-body">
            {settings.announcements.map((a, i) => (
              <div className="variant-row" key={i} style={{ gridTemplateColumns: "1fr auto" }}>
                <input
                  value={a}
                  onChange={(e) => {
                    const next = [...settings.announcements];
                    next[i] = e.target.value;
                    setSettings({ ...settings, announcements: next });
                  }}
                />
                <button
                  className="admin-btn small danger"
                  onClick={() => setSettings({ ...settings, announcements: settings.announcements.filter((_, idx) => idx !== i) })}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className="admin-btn small outline"
              onClick={() => setSettings({ ...settings, announcements: [...settings.announcements, "New announcement"] })}
            >
              + Add message
            </button>
          </div>
        </div>

        {/* Marquee */}
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Marquee text</h2>
            <SaveButton saved={savedKey === "marqueeText"} onClick={() => save("marqueeText", settings.marqueeText)} />
          </div>
          <div className="admin-panel-body">
            <div className="field">
              <label>Scrolling strip text</label>
              <input value={settings.marqueeText} onChange={(e) => setSettings({ ...settings, marqueeText: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Hero slides */}
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Hero slides</h2>
            <SaveButton saved={savedKey === "heroSlides"} onClick={() => save("heroSlides", settings.heroSlides)} />
          </div>
          <div className="admin-panel-body">
            {settings.heroSlides.map((slide, i) => (
              <div key={i} style={{ border: "1px dashed var(--line)", padding: 14, marginBottom: 14 }}>
                <div className="field">
                  <label>Eyebrow</label>
                  <input
                    value={slide.eyebrow}
                    onChange={(e) => {
                      const next = [...settings.heroSlides];
                      next[i] = { ...slide, eyebrow: e.target.value };
                      setSettings({ ...settings, heroSlides: next });
                    }}
                  />
                </div>
                <div className="field">
                  <label>Heading (use &lt;em&gt;word&lt;/em&gt; for the indigo highlight)</label>
                  <input
                    value={slide.heading}
                    onChange={(e) => {
                      const next = [...settings.heroSlides];
                      next[i] = { ...slide, heading: e.target.value };
                      setSettings({ ...settings, heroSlides: next });
                    }}
                  />
                </div>
                <div className="field">
                  <label>Body text</label>
                  <textarea
                    rows={2}
                    value={slide.text}
                    onChange={(e) => {
                      const next = [...settings.heroSlides];
                      next[i] = { ...slide, text: e.target.value };
                      setSettings({ ...settings, heroSlides: next });
                    }}
                  />
                </div>
                <div className="form-row">
                  <div className="field">
                    <label>CTA button text</label>
                    <input
                      value={slide.cta}
                      onChange={(e) => {
                        const next = [...settings.heroSlides];
                        next[i] = { ...slide, cta: e.target.value };
                        setSettings({ ...settings, heroSlides: next });
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>Links to collection (category slug, or &quot;Sale&quot;)</label>
                    <input
                      placeholder="e.g. tops, bottoms, accessories, Sale — see Admin → Categories for slugs"
                      value={slide.filter.group || ""}
                      onChange={(e) => {
                        const next = [...settings.heroSlides];
                        next[i] = { ...slide, filter: { ...slide.filter, group: e.target.value || undefined } };
                        setSettings({ ...settings, heroSlides: next });
                      }}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Garment-tag lines (one per line, use &lt;hr&gt; for a divider)</label>
                  <textarea
                    rows={4}
                    value={slide.tagLines.join("\n")}
                    onChange={(e) => {
                      const next = [...settings.heroSlides];
                      next[i] = { ...slide, tagLines: e.target.value.split("\n") };
                      setSettings({ ...settings, heroSlides: next });
                    }}
                  />
                </div>
                <button
                  className="admin-btn small danger"
                  onClick={() => setSettings({ ...settings, heroSlides: settings.heroSlides.filter((_, idx) => idx !== i) })}
                >
                  Remove slide
                </button>
              </div>
            ))}
            <button
              className="admin-btn small outline"
              onClick={() =>
                setSettings({
                  ...settings,
                  heroSlides: [
                    ...settings.heroSlides,
                    { eyebrow: "", heading: "New <em>slide</em>", text: "", cta: "Shop now", filter: {}, tagLines: [] },
                  ],
                })
              }
            >
              + Add slide
            </button>
          </div>
        </div>

        {/* Shipping & payments */}
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Shipping &amp; payments</h2>
            <SaveButton
              saved={savedKey === "shipping"}
              onClick={async () => {
                await save("shippingFee", settings.shippingFee);
                await save("freeShippingThreshold", settings.freeShippingThreshold);
                await save("bankDetails", settings.bankDetails);
                await save("whatsappNumber", settings.whatsappNumber);
                setSavedKey("shipping");
                setTimeout(() => setSavedKey(null), 1800);
              }}
            />
          </div>
          <div className="admin-panel-body">
            <div className="form-row">
              <div className="field">
                <label>Flat shipping fee (PKR)</label>
                <input
                  type="number"
                  value={settings.shippingFee}
                  onChange={(e) => setSettings({ ...settings, shippingFee: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label>Free shipping over (PKR)</label>
                <input
                  type="number"
                  value={settings.freeShippingThreshold}
                  onChange={(e) => setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="field">
              <label>WhatsApp number</label>
              <input
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Bank name</label>
                <input
                  value={settings.bankDetails.bankName}
                  onChange={(e) => setSettings({ ...settings, bankDetails: { ...settings.bankDetails, bankName: e.target.value } })}
                />
              </div>
              <div className="field">
                <label>Account title</label>
                <input
                  value={settings.bankDetails.accountTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, bankDetails: { ...settings.bankDetails, accountTitle: e.target.value } })
                  }
                />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Account number</label>
                <input
                  value={settings.bankDetails.accountNumber}
                  onChange={(e) =>
                    setSettings({ ...settings, bankDetails: { ...settings.bankDetails, accountNumber: e.target.value } })
                  }
                />
              </div>
              <div className="field">
                <label>IBAN</label>
                <input
                  value={settings.bankDetails.iban}
                  onChange={(e) => setSettings({ ...settings, bankDetails: { ...settings.bankDetails, iban: e.target.value } })}
                />
              </div>
            </div>
            <div className="field">
              <label>Branch</label>
              <input
                value={settings.bankDetails.branch}
                onChange={(e) => setSettings({ ...settings, bankDetails: { ...settings.bankDetails, branch: e.target.value } })}
              />
            </div>
          </div>
        </div>

        {/* Info pages */}
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2>Info pages</h2>
            <SaveButton saved={savedKey === "infoPages"} onClick={() => save("infoPages", settings.infoPages)} />
          </div>
          <div className="admin-panel-body">
            {(["shipping", "returns", "faq", "contact", "terms", "privacy"] as const).map((key) => (
              <div key={key} style={{ marginBottom: 18 }}>
                <div className="field">
                  <label>{key} — title</label>
                  <input
                    value={settings.infoPages[key].title}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        infoPages: { ...settings.infoPages, [key]: { ...settings.infoPages[key], title: e.target.value } },
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label>{key} — body (HTML allowed: &lt;b&gt;, &lt;br&gt;, &lt;a href&gt;)</label>
                  <textarea
                    rows={key === "terms" || key === "privacy" ? 10 : 3}
                    value={settings.infoPages[key].body}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        infoPages: { ...settings.infoPages, [key]: { ...settings.infoPages[key], body: e.target.value } },
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
