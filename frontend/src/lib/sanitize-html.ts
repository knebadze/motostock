import DOMPurify from "isomorphic-dompurify";

// Admin-authored rich text (product/vehicle-listing descriptions) is trusted
// today since only admins can write it, but sanitizing before render is
// defense-in-depth against a compromised admin account or a future bug that
// loosens the write-side auth guard — cheap insurance, no reason to skip it.
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html);
}
