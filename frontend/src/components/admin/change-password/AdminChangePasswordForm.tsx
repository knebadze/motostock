"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { changePassword } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";

// Same backend endpoint (PATCH /users/me/password) and API client function
// as the storefront's ChangePasswordForm — this is just an admin-panel-
// styled (plain Georgian, no next-intl, matching this panel's other forms)
// re-implementation of that same form, since the admin panel sits outside
// next-intl's provider tree entirely.
export function AdminChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("ახალი პაროლები არ ემთხვევა ერთმანეთს");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword || undefined, newPassword);
      toast.success("პაროლი წარმატებით შეიცვალა");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "პაროლის შეცვლა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 w-full max-w-sm rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="current-password" className="text-sm font-medium">
            მიმდინარე პაროლი
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
            ახალი პაროლი
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
            გაიმეორეთ ახალი პაროლი
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
          className="mt-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "მუშავდება..." : "პაროლის შეცვლა"}
        </button>
      </div>
    </form>
  );
}
