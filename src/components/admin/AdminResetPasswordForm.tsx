"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function AdminResetPasswordForm({
  token,
  brandName,
  logoUrl,
}: {
  token: string | null;
  brandName: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("This reset link is missing its token — please request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not reset password.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/admin/login"), 1800);
    } catch {
      setError("Network error — please try again.");
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
        <div className="admin-login-sub">Choose a new password</div>
        {done ? (
          <p className="note" style={{ textAlign: "left" }}>
            Password updated — redirecting you to login…
          </p>
        ) : (
          <form onSubmit={submit}>
            {error && <div className="admin-error">{error}</div>}
            {!token && (
              <div className="admin-error">
                No reset token found in the link. <Link href="/admin/forgot-password">Request a new one</Link>.
              </div>
            )}
            <div className="field">
              <label htmlFor="password">New password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm new password</label>
              <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
            </div>
            <button className="place-btn" type="submit" disabled={loading || !token}>
              {loading ? "Saving…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
