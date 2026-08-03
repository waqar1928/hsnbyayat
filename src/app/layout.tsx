import type { Metadata } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font instead of a <link> to fonts.googleapis.com:
// removes a render-blocking third-party request (extra DNS + connection +
// download round trip) and eliminates the flash-of-fallback-font layout
// shift, since Next.js downloads the font files at build time and serves
// them from our own origin with correct preload + font-display hints.
// The generated CSS variables are wired into --sans/--mono in globals.css
// (:root) so every existing var(--sans)/var(--mono) rule in the stylesheet
// keeps working unchanged.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "HSN BY AYAT — Everyday Essentials",
    template: "%s | HSN BY AYAT",
  },
  description: "Heavyweight cotton essentials, cut & sewn in Lahore. Small-batch drops, honest stitching, nationwide cash on delivery.",
  openGraph: {
    type: "website",
    siteName: "HSN BY AYAT",
    title: "HSN BY AYAT — Everyday Essentials",
    description: "Heavyweight cotton essentials, cut & sewn in Lahore.",
    locale: "en_PK",
  },
  twitter: {
    card: "summary_large_image",
    title: "HSN BY AYAT — Everyday Essentials",
    description: "Heavyweight cotton essentials, cut & sewn in Lahore.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// True app root — deliberately minimal. Storefront chrome lives in
// app/(storefront)/layout.tsx and the admin shell lives in app/admin/layout.tsx,
// so neither surface leaks into the other.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
