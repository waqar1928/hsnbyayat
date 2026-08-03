"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/cartStore";

// Manually triggers the cart store's localStorage rehydration after mount
// (paired with skipHydration: true in cartStore.ts) so the first client
// render matches the server-rendered empty cart, avoiding a hydration
// mismatch — the real cart then appears via a normal state update.
export default function CartHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  return null;
}
