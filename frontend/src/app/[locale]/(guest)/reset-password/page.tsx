import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/shared/ResetPasswordForm";
import { noindexMetadata } from "@/lib/seo";

// Auth flows aren't content — keep them out of search results.
export const metadata: Metadata = noindexMetadata({ follow: false });

// Deliberately no already-authenticated redirect here (unlike login/register/
// forgot-password) — someone already logged in on this device may still have
// a valid reset link from an email and should be able to use it.
export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center px-4 py-10 sm:py-16 lg:py-24">
      <ResetPasswordForm />
    </div>
  );
}
