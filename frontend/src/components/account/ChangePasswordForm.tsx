"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { changePassword } from "@/lib/api/auth";
import { resolveApiErrorMessage } from "@/lib/api-errors";

export function ChangePasswordForm() {
  const t = useTranslations("Account.changePassword");
  const tErrors = useTranslations("ApiErrors");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t("mismatch"));
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword || undefined, newPassword);
      toast.success(t("success"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("error")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="current-password" className="text-sm font-medium">
            {t("currentPasswordLabel")}
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-password" className="text-sm font-medium">
            {t("newPasswordLabel")}
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-password" className="text-sm font-medium">
            {t("confirmPasswordLabel")}
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
