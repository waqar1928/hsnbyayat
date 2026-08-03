"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/uiStore";

export default function GlobalKeyHandler() {
  const closeAll = useUIStore((s) => s.closeAll);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeAll]);

  return null;
}
