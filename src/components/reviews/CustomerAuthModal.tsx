"use client";

import { useState } from "react";

// Minimal login/register UI for the Customer accounts system
// (src/app/api/customer/{login,register,me}) — until now that API had no
// frontend consumer at all (checkout is guest-first via phone-number order
// tracking instead, see /track). Reviews are the first feature that needs
// a persistent customer identity, so this is scoped tightly to that: log
// in or create an account, then hand control back to the caller.
export default function CustomerAuthModal({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const url = mode === "login" ? "/api/customer/login" : "/api/customer/register";
      const body = mode === "login" ? { phone, password } : { name, phone, email: email || undefined, password };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal open">
      <div className="modal-box">
        <div className="modal-head">
          <h3>{mode === "login" ? "Log in to review" : "Create an account"}</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Log in
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              Create account
            </button>
          </div>
          {error && <div className="admin-error" style={{ marginBottom: 14 }}>{error}</div>}
          <form onSubmit={submit}>
            {mode === "register" && (
              <div className="field">
                <label>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="field">
              <label>Phone number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx xxxxxxx" required />
            </div>
            {mode === "register" && (
              <div className="field">
                <label>Email (optional)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </div>
            <button className="qv-add" type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
