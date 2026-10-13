import type { Metadata } from "next";
import { VerifyEmailView } from "@/components/shared/VerifyEmailView";
import { noindexMetadata } from "@/lib/seo";

// Auth/transactional flow, not content — keep it out of search results,
// same as reset-password.
export const metadata: Metadata = noindexMetadata({ follow: false });

export default function VerifyEmailPage() {
  return (
    <div className="flex items-center justify-center px-4 py-10 sm:py-16 lg:py-24">
      <VerifyEmailView />
    </div>
  );
}
