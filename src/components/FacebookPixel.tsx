"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// Renders nothing (and loads nothing) unless a pixel ID is set in
// Admin → Content → Analytics. The base snippet below is Meta's standard
// pixel code, adapted for next/script (afterInteractive — doesn't block
// first paint) and for the Next.js App Router specifically: the base
// snippet's own `fbq('track', 'PageView')` only covers the very first
// load, since client-side navigations afterward don't trigger a fresh
// script evaluation — so a PageView is fired again on every pathname
// change. (Deliberately not also watching search params — that needs a
// Suspense boundary around useSearchParams(), and query-string-only
// changes like shop filters aren't meaningfully distinct "pages" for ad
// tracking purposes anyway.)
export default function FacebookPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!pixelId) return;
    if (isFirstLoad.current) {
      // Base snippet's inline fbq('track', 'PageView') already covers this
      // one — skip the duplicate.
      isFirstLoad.current = false;
      return;
    }
    if (typeof window.fbq === "function") window.fbq("track", "PageView");
  }, [pixelId, pathname]);

  if (!pixelId) return null;

  return (
    <Script id="fb-pixel-base" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
