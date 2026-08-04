"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/adminFetch";
import { formatPKR } from "@/lib/types";

type PolledOrder = { id: string; orderNumber: string; customerName: string; total: number; createdAt: string };
type ToastItem = PolledOrder & { toastId: string };

const POLL_INTERVAL_MS = 15000;

/** Short two-note chime via the Web Audio API — no audio asset file needed.
 * Browsers block audio before any user gesture on the page, so this quietly
 * no-ops until the admin has clicked/typed anywhere at least once. */
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [[880, 0], [1108.73, 0.12]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.18, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.5);
      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });
    // AudioContexts pile up if left open — close it once the chime finishes.
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    // Web Audio unsupported/blocked — the visual toast alone is still fine.
  }
}

export default function AdminOrderNotifications() {
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const sinceRef = useRef<string>(new Date().toISOString());
  const audioUnlockedRef = useRef(false);
  const baseTitleRef = useRef<string>("");

  // Unlock audio playback on the first click/keypress anywhere on the page —
  // sidesteps the browser autoplay restriction without needing the admin to
  // click a specific "enable sound" button.
  useEffect(() => {
    function unlock() {
      audioUnlockedRef.current = true;
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    }
    window.addEventListener("click", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Visiting the Orders page is treated as "caught up" — clears the tab
  // title badge. (Individual toasts still auto-dismiss on their own timer
  // regardless of which page you're on.) Adjusted directly during render
  // (React's recommended pattern for "reset state when a prop changes")
  // rather than a useEffect, avoiding an extra commit-then-effect round trip.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (pathname === "/admin/orders") setUnreadCount(0);
  }

  useEffect(() => {
    if (!baseTitleRef.current) baseTitleRef.current = document.title;
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitleRef.current}` : baseTitleRef.current;
  }, [unreadCount]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await adminFetch<{ orders: PolledOrder[]; serverTime: string }>(
          `/api/admin/orders/poll?since=${encodeURIComponent(sinceRef.current)}`
        );
        if (cancelled) return;
        sinceRef.current = data.serverTime;
        if (data.orders.length > 0) {
          const newToasts = data.orders.map((o) => ({ ...o, toastId: `${o.id}-${Date.now()}` }));
          setToasts((prev) => [...prev, ...newToasts]);
          setUnreadCount((prev) => prev + data.orders.length);
          if (audioUnlockedRef.current) playChime();
          newToasts.forEach((t) => {
            setTimeout(() => dismissToast(t.toastId), 8000);
          });
        }
      } catch {
        // A missed poll (e.g. a momentary network blip) just tries again on
        // the next tick — not worth surfacing an error for.
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="admin-order-toast-stack no-print" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.toastId}
          className="admin-order-toast"
          onClick={() => {
            dismissToast(t.toastId);
            router.push(`/admin/orders/${t.id}`);
          }}
        >
          <div className="admin-order-toast-head">
            <span>New order</span>
            <span
              className="admin-order-toast-close"
              onClick={(e) => {
                e.stopPropagation();
                dismissToast(t.toastId);
              }}
              aria-label="Dismiss"
            >
              ✕
            </span>
          </div>
          <div className="admin-order-toast-body">
            <strong>{t.orderNumber}</strong> — {t.customerName}
          </div>
          <div className="admin-order-toast-total">{formatPKR(t.total)}</div>
        </button>
      ))}
    </div>
  );
}
