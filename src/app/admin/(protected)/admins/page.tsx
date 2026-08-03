"use client";

import { useEffect, useState } from "react";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { adminFetch } from "@/lib/adminFetch";

type Admin = { id: string; email: string; name: string; createdAt: string };

export default function AdminAdminsPage() {
  const [items, setItems] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // `fetchAdmins` is the actual data fetch; `load` additionally flips the
  // loading flag back on for the two post-mutation refetches below (invite,
  // remove). The mount effect calls `fetchAdmins` directly — `loading`
  // already starts `true`, so there's nothing to synchronously set there.
  function fetchAdmins() {
    return adminFetch<{ items: Admin[] }>("/api/admin/admins")
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }
  function load() {
    setLoading(true);
    fetchAdmins();
  }

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviting(true);
    try {
      await adminFetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      setName("");
      setEmail("");
      setPassword("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create admin.");
    } finally {
      setInviting(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    setChangingPassword(true);
    try {
      await adminFetch("/api/admin/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this admin? They will no longer be able to log in.")) return;
    try {
      await adminFetch(`/api/admin/admins/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove admin.");
    }
  }

  return (
    <>
      <AdminTopbar title="Admin users" />
      <div className="admin-content">
        <div className="admin-form-grid">
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Team</h2>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="note" style={{ padding: 20 }}>
                      Loading…
                    </td>
                  </tr>
                )}
                {items.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.email}</td>
                    <td>{new Date(a.createdAt).toLocaleDateString("en-PK")}</td>
                    <td>
                      <button className="admin-btn small danger" onClick={() => remove(a.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Invite admin</h2>
            </div>
            <div className="admin-panel-body">
              {error && <div className="admin-error">{error}</div>}
              <form onSubmit={invite}>
                <div className="field">
                  <label>Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Temporary password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                </div>
                <button className="admin-btn" style={{ width: "100%" }} disabled={inviting}>
                  {inviting ? "Adding…" : "Add admin"}
                </button>
              </form>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2>Your password</h2>
            </div>
            <div className="admin-panel-body">
              {passwordError && <div className="admin-error">{passwordError}</div>}
              <form onSubmit={changePassword}>
                <div className="field">
                  <label>Current password</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>New password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="field">
                  <label>Confirm new password</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <button className="admin-btn" style={{ width: "100%" }} disabled={changingPassword}>
                  {changingPassword ? "Saving…" : passwordSaved ? "Saved ✓" : "Change password"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
