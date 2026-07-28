import { ResetPasswordForm } from "@/components/shared/ResetPasswordForm";

// Deliberately no already-authenticated redirect here (unlike login/register/
// forgot-password) — someone already logged in on this device may still have
// a valid reset link from an email and should be able to use it.
export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center px-4 py-24">
      <ResetPasswordForm />
    </div>
  );
}
