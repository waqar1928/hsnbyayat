"use client";

import { useToastStore } from "@/lib/uiStore";

export default function Toast() {
  const message = useToastStore((s) => s.message);
  return <div className={`toast ${message ? "show" : ""}`}>{message}</div>;
}
