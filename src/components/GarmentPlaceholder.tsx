// Drawn-SVG garment placeholder, ported 1:1 from garmentSVG() in
// threadform-store.html. Rendered whenever a product has no uploaded photos.
import type { ReactNode } from "react";

const FALLBACK_COLOR = "#9B988E";

export default function GarmentPlaceholder({
  type,
  color,
  className,
}: {
  type: string | null | undefined;
  color: string | null | undefined;
  className?: string;
}) {
  const c = color || FALLBACK_COLOR;
  const d = "#17171555";

  const shapes: Record<string, ReactNode> = {
    tee: (
      <path
        d="M38 16 l-24 16 9 18 11-6 v52 h52 v-52 l11 6 9-18 -24-16 a22 10 0 0 1-44 0 z"
        fill={c}
        stroke={d}
        strokeWidth={1.5}
      />
    ),
    fleece: (
      <>
        <path
          d="M35 18 l-22 14 8 20 12-6 v50 h54 v-50 l12 6 8-20 -22-14 a25 12 0 0 1-50 0 z"
          fill={c}
          stroke={d}
          strokeWidth={1.5}
        />
        <path d="M48 96 v-20 a12 10 0 0 1 24 0 v20" fill="none" stroke={d} strokeWidth={1.2} />
      </>
    ),
    crew: (
      <path
        d="M35 18 l-22 14 8 20 12-6 v50 h54 v-50 l12 6 8-20 -22-14 a25 12 0 0 1-50 0 z"
        fill={c}
        stroke={d}
        strokeWidth={1.5}
      />
    ),
    layer: (
      <>
        <path
          d="M35 15 l-22 14 8 20 12-6 v53 h54 v-53 l12 6 8-20 -22-14 a25 12 0 0 1-50 0 z"
          fill={c}
          stroke={d}
          strokeWidth={1.5}
        />
        <line x1="60" y1="28" x2="60" y2="94" stroke={d} strokeWidth={1.2} />
        <circle cx="60" cy="42" r="1.8" fill={d} />
        <circle cx="60" cy="58" r="1.8" fill={d} />
        <circle cx="60" cy="74" r="1.8" fill={d} />
      </>
    ),
    pant: (
      <>
        <path
          d="M34 8 h52 l7 100 h-24 l-9-64 -9 64 h-24 z"
          fill={c}
          stroke={d}
          strokeWidth={1.5}
          transform="translate(0,2)"
        />
        <line x1="34" y1="22" x2="86" y2="22" stroke={d} strokeWidth={1} />
      </>
    ),
    short: (
      <>
        <path
          d="M32 14 h56 l6 52 h-24 l-10-34 -10 34 h-24 z"
          fill={c}
          stroke={d}
          strokeWidth={1.5}
          transform="translate(0,20)"
        />
        <line x1="32" y1="46" x2="88" y2="46" stroke={d} strokeWidth={1} />
      </>
    ),
    cap: (
      <>
        <path d="M25 62 a35 35 0 0 1 70 0 z" fill={c} stroke={d} strokeWidth={1.5} />
        <path d="M25 62 h70 q22 0 24 10 q-40 -4 -94 -4 z" fill={c} stroke={d} strokeWidth={1.5} />
        <path d="M60 27 v35" stroke={d} strokeWidth={1} />
      </>
    ),
    tote: (
      <>
        <rect x="30" y="40" width="60" height="62" fill={c} stroke={d} strokeWidth={1.5} />
        <path d="M44 40 v-8 a16 14 0 0 1 32 0 v8" fill="none" stroke={d} strokeWidth={2.5} />
        <line x1="30" y1="56" x2="90" y2="56" stroke={d} strokeWidth={1} />
      </>
    ),
    sock: (
      <>
        <path
          d="M46 12 h26 v50 q0 8 8 14 l6 5 a16 16 0 0 1-20 24 l-14-11 q-6-5-6-13 z"
          fill={c}
          stroke={d}
          strokeWidth={1.5}
        />
        <line x1="46" y1="24" x2="72" y2="24" stroke={d} strokeWidth={1} />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 120 118" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      {shapes[type || "tee"] || shapes.tee}
    </svg>
  );
}
