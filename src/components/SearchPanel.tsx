"use client";

import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/lib/uiStore";
import { formatPKR, effectivePrice } from "@/lib/types";

type SearchResult = {
  slug: string;
  name: string;
  group: string;
  subcategory: string;
  price: number;
  salePrice: number | null;
  salePct: number | null;
};

export default function SearchPanel() {
  const { searchOpen, closeSearch, openQuickView } = useUIStore();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [searchOpen]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) return;
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.items);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  // Clearing the query is a direct consequence of the user's own keystroke,
  // not something that needs an effect to "synchronize" — so it's handled
  // right in the change handler instead of as a synchronous setState at the
  // top of the debounce effect above.
  function handleQueryChange(value: string) {
    setQ(value);
    if (!value.trim()) setResults(null);
  }

  function pick(slug: string) {
    closeSearch();
    setQ("");
    setResults(null);
    openQuickView(slug);
  }

  return (
    <div className={`search-panel ${searchOpen ? "open" : ""}`}>
      <div className="search-row">
        <input
          ref={inputRef}
          type="text"
          placeholder="SEARCH PRODUCTS…"
          aria-label="Search products"
          value={q}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        <button className="close-btn" onClick={closeSearch} aria-label="Close search">
          ✕
        </button>
      </div>
      <div className="search-results">
        {!q.trim() && <div className="sr-empty">Type to search products</div>}
        {q.trim() && results === null && <div className="sr-empty">Searching…</div>}
        {results?.length === 0 && <div className="sr-empty">No matches for &quot;{q}&quot;</div>}
        {results?.map((p) => (
          <button className="sr-item" key={p.slug} onClick={() => pick(p.slug)}>
            <span>
              <span className="sr-name">{p.name}</span>
              <br />
              <span className="sr-meta">
                {p.group} · {p.subcategory}
              </span>
            </span>
            <span className="sr-price">{formatPKR(effectivePrice(p))}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
