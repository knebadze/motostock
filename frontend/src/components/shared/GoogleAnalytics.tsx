import Script from "next/script";
import { headers } from "next/headers";
import { ANALYTICS_CONSENT_STORAGE_KEY } from "@/lib/analytics-consent";

// Renders nothing until NEXT_PUBLIC_GA_MEASUREMENT_ID is actually set — the
// client has no Google Analytics property yet (and no delivered business
// email to set one up under), so this stays fully inert in every environment
// until that env var is added later, at which point analytics turns on with
// no further code changes. Storefront-only: rendered from [locale]/layout.tsx,
// never from the separate admin layout — matches every other admin-excluded
// analytics/tracking concern in this codebase.
export async function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return null;

  // Same nonce proxy.ts stamps onto every request (see JsonLd.tsx's identical
  // read) — gtag.js's own <script src> tag needs it to satisfy the strict
  // script-src CSP; everything gtag.js itself injects afterward is trusted
  // automatically via 'strict-dynamic' (proxy.ts), so only these two tags
  // need the nonce, not every network call gtag.js makes internally (those
  // go through connect-src, separately allow-listed in proxy.ts).
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="ga4-init" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          // Consent Mode v2: everything denied by default — no analytics
          // cookies until the visitor accepts in CookieNotice.tsx (which
          // sends a 'consent update'). A choice made on an earlier visit is
          // applied here, before gtag.js loads. No ads on this site, so the
          // ad_* signals stay denied permanently.
          var analyticsConsent = 'denied';
          try {
            if (localStorage.getItem('${ANALYTICS_CONSENT_STORAGE_KEY}') === 'granted') analyticsConsent = 'granted';
          } catch (e) {}
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: analyticsConsent,
            wait_for_update: 500
          });
          gtag('js', new Date());
          // One-time tokens (password reset, email verification, newsletter
          // links: ?token=…) never go to Google — the page URL is sent with
          // them blanked out.
          gtag('config', '${measurementId}', {
            page_location: location.href.replace(/([?&](?:token|code|state)=)[^&#]*/gi, '$1redacted')
          });
        `}
      </Script>
    </>
  );
}
