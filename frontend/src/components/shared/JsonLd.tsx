import { headers } from "next/headers";
import { jsonLdScriptProps } from "@/lib/seo";

// Every <script> element is subject to the site's script-src CSP directive
// (proxy.ts), including type="application/ld+json" ones despite being inert
// JSON, not executable code — without the nonce below, a strict CSP would
// silently drop this structured data instead of just blocking real scripts.
// Reads the nonce proxy.ts stamped onto this request instead of taking it as
// a prop, so call sites stay a plain drop-in replacement for the old
// `<script type="application/ld+json" dangerouslySetInnerHTML={...} />`.
export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={jsonLdScriptProps(data)} />;
}
