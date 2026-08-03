"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function AdminForgotPasswordForm({ brandName, logoUrl }: { brandName: string; logoUrl: string | null }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || "If that email has an admin account, a reset link has been sent.");
    } catch {
      setMessage("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-box">
        <div className="logo">
          <BrandMark logoUrl={logoUrl} alt={brandName} />
        </div>
        <div className="admin-login-sub">Reset your password</div>
        {message ? (
          <>
            <p className="note" style={{ textAlign: "left", marginBottom: 18 }}>
              {message}
            </p>
            <Link className="admin-btn outline" style={{ width: "100%", textAlign: "center", display: "block" }} href="/admin/login">
              Back to login
            </Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="place-btn" type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <div className="note">
              <Link href="/admin/login">Back to login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
