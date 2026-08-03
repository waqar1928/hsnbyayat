import Link from "next/link";

// Plain server-rendered pagination — no client JS needed since it's just links.
export default function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <Link
        href={buildHref(page - 1)}
        className="page-btn"
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        style={page <= 1 ? { pointerEvents: "none", opacity: 0.35 } : undefined}
      >
        ‹
      </Link>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="page-btn" style={{ border: "none", background: "none" }}>
            …
          </span>
        ) : (
          <Link key={p} href={buildHref(p)} className={`page-btn ${p === page ? "active" : ""}`}>
            {p}
          </Link>
        )
      )}
      <Link
        href={buildHref(page + 1)}
        className="page-btn"
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
        style={page >= totalPages ? { pointerEvents: "none", opacity: 0.35 } : undefined}
      >
        ›
      </Link>
    </nav>
  );
}
