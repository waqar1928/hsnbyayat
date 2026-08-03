"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  size: string;
  unitPrice: number; // effective (sale-aware) price snapshot at add-time; server re-validates at checkout
  qty: number;
  imageUrl: string | null;
  placeholderType: string | null;
  placeholderColor: string | null;
  group: string;
  subcategory: string;
  salePct: number | null;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  changeQty: (variantId: string, delta: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
};

// Guest cart lives entirely in localStorage (never security-sensitive data —
// just product/size/qty selections). At checkout, if a customer is logged
// in, the resulting order is linked to their account server-side; there is
// no separate server-persisted cart to "merge" into.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId ? { ...i, qty: i.qty + item.qty } : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      changeQty: (variantId, delta) =>
        set((state) => {
          const items = state.items
            .map((i) => (i.variantId === variantId ? { ...i, qty: i.qty + delta } : i))
            .filter((i) => i.qty > 0);
          return { items };
        }),
      removeItem: (variantId) => set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "threadform-cart",
      // Without this, persist reads localStorage synchronously as soon as
      // this module runs on the client — before React's first hydration
      // pass — so a non-empty cart from a previous visit mismatches the
      // empty cart the server rendered (it has no access to localStorage).
      // skipHydration + a manual rehydrate() after mount (see
      // CartHydration.tsx) makes the first client render match the server,
      // then swaps in the real cart as an ordinary post-mount update.
      skipHydration: true,
    }
  )
);

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}
