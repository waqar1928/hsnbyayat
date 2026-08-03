"use client";

import { create } from "zustand";

// Global overlay state (cart drawer, search panel, quick-view modal,
// checkout modal, mobile nav). Mirrors the open/close choreography from the
// original threadform-store.html: opening the cart closes search and vice
// versa, sharing one dim overlay behind whichever is open.

type UIState = {
  cartOpen: boolean;
  searchOpen: boolean;
  checkoutOpen: boolean;
  quickViewSlug: string | null;
  mobileNavOpen: boolean;

  openCart: () => void;
  closeCart: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  openQuickView: (slug: string) => void;
  closeQuickView: () => void;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
  closeAll: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  cartOpen: false,
  searchOpen: false,
  checkoutOpen: false,
  quickViewSlug: null,
  mobileNavOpen: false,

  openCart: () => set({ cartOpen: true, searchOpen: false }),
  closeCart: () => set({ cartOpen: false, searchOpen: false }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  openCheckout: () => set({ checkoutOpen: true, cartOpen: false }),
  closeCheckout: () => set({ checkoutOpen: false }),
  openQuickView: (slug) => set({ quickViewSlug: slug }),
  closeQuickView: () => set({ quickViewSlug: null }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  closeAll: () =>
    set({ cartOpen: false, searchOpen: false, checkoutOpen: false, quickViewSlug: null, mobileNavOpen: false }),
}));

// --- Toast ---
type ToastState = {
  message: string | null;
  show: (message: string) => void;
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => {
    set({ message });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ message: null }), 2200);
  },
}));
