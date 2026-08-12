import type { Metadata } from "next";
import { NewsletterConfirmView } from "@/components/shared/NewsletterConfirmView";

// Auth/transactional flow, not content — keep it out of search results,
// same as reset-password.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function NewsletterConfirmPage() {
  return (
    <div className="flex items-center justify-center px-4 py-24">
      <NewsletterConfirmView />
    </div>
  );
}
