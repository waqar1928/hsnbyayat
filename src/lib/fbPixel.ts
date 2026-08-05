// Thin, safe wrapper around window.fbq (loaded by components/FacebookPixel.tsx
// only when a pixel ID is configured in Admin → Content). Every call site
// elsewhere in the app just calls trackFbEvent(...) — it silently no-ops
// if the pixel isn't configured or hasn't finished loading yet, so nothing
// needs to guard against that itself.
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackFbEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", event, params);
}
