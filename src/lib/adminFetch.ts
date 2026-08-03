"use client";

// Thin wrapper around fetch for admin client components. If the session has
// expired or been invalidated (401), redirect to login instead of letting
// every page crash trying to read fields off an { error: ... } response.
export async function adminFetch<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    window.location.href = "/admin/login";
    // Never resolves meaningfully — the redirect is already underway.
    return new Promise(() => {});
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}
