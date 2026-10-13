"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { DateInput } from "@/components/shared/DateInput";
import { Modal } from "@/components/shared/Modal";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatDateTime, toTbilisiDateOnly } from "@/lib/format";
import {
  acceptConsents,
  deleteMyAccount,
  getMyDataExportUrl,
  updateProfile,
  type Profile,
} from "@/lib/api/account-data";

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60";

// The customer's personal-data page (personal data protection law): edit
// what can be edited, see the recorded consent, download a copy of
// everything stored, delete the account.
export function ProfileManager({ initialProfile }: { initialProfile: Profile }) {
  const t = useTranslations("Account.profile");
  const tErrors = useTranslations("ApiErrors");
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);

  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth ?? "");
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast.error(t("nameError"));
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile({ firstName, lastName, phone: phone.trim(), dateOfBirth });
      setProfile(updated);
      toast.success(t("saved"));
      // Header shows the name.
      router.refresh();
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("saveError")));
    } finally {
      setSaving(false);
    }
  }

  async function handleAccept() {
    setAccepting(true);
    try {
      setProfile(await acceptConsents());
      toast.success(t("consentAccepted"));
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("saveError")));
    } finally {
      setAccepting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMyAccount(profile.hasPassword ? { password: deletePassword } : { confirmEmail: deleteEmail });
      toast.success(t("deleted"));
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("deleteError")));
      setDeleting(false);
    }
  }

  const canConfirmDelete = profile.hasPassword ? deletePassword.length > 0 : deleteEmail.trim().length > 0;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {/* Personal details */}
      <form onSubmit={handleSave} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold text-foreground">{t("detailsHeading")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-first-name" className="text-sm font-medium">
              {t("firstName")}
            </label>
            <input
              id="profile-first-name"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              maxLength={50}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-last-name" className="text-sm font-medium">
              {t("lastName")}
            </label>
            <input
              id="profile-last-name"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              maxLength={50}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-phone" className="text-sm font-medium">
              {t("phone")}
            </label>
            <input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={20}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profile-dob" className="text-sm font-medium">
              {t("dateOfBirth")}
            </label>
            <DateInput
              id="profile-dob"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              max={toTbilisiDateOnly(new Date().toISOString())}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="profile-email" className="text-sm font-medium">
              {t("email")}
            </label>
            <input id="profile-email" value={profile.email} disabled className={inputClassName} />
            <span className="text-xs text-muted-foreground">{t("emailNote")}</span>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? t("saving") : t("save")}
        </button>
      </form>

      {/* Consent */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold text-foreground">{t("consentHeading")}</h2>
        {profile.consent.termsAcceptedAt ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("consentAcceptedAt", { date: formatDateTime(profile.consent.termsAcceptedAt) })}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{t("consentMissing")}</p>
        )}
        <p className="mt-1 text-sm">
          <Link href="/terms" target="_blank" className="font-medium text-primary-text hover:underline">
            {t("termsLink")}
          </Link>
          {" · "}
          <Link href="/privacy" target="_blank" className="font-medium text-primary-text hover:underline">
            {t("privacyLink")}
          </Link>
        </p>
        {!profile.consent.upToDate && (
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-sm text-foreground">
              {profile.consent.termsAcceptedAt ? t("consentOutdated") : t("consentPrompt")}
            </p>
            <button
              type="button"
              onClick={() => void handleAccept()}
              disabled={accepting}
              className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {t("consentAcceptButton")}
            </button>
          </div>
        )}
      </section>

      {/* Data export */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold text-foreground">{t("exportHeading")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("exportDescription")}</p>
        <a
          href={getMyDataExportUrl()}
          download
          className="mt-3 inline-block rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {t("exportButton")}
        </a>
      </section>

      {/* Delete account */}
      {profile.canDelete && (
        <section className="rounded-2xl border border-red-500/40 bg-card p-5 sm:p-6">
          <h2 className="font-semibold text-red-600">{t("deleteHeading")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("deleteDescription")}</p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="mt-3 rounded-full border border-red-500 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10"
          >
            {t("deleteButton")}
          </button>
        </section>
      )}

      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title={t("deleteConfirmTitle")}
        closeLabel={t("cancel")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">{t("deleteConfirmText")}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>{t("deleteConfirmRemoved")}</li>
            <li>{t("deleteConfirmOrders")}</li>
            <li>{t("deleteConfirmActive")}</li>
          </ul>
          {profile.hasPassword ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="delete-password" className="text-sm font-medium">
                {t("deletePasswordLabel")}
              </label>
              <PasswordInput
                id="delete-password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="delete-email" className="text-sm font-medium">
                {t("deleteEmailLabel", { email: profile.email })}
              </label>
              <input
                id="delete-email"
                type="email"
                value={deleteEmail}
                onChange={(event) => setDeleteEmail(event.target.value)}
                className={inputClassName}
              />
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting || !canConfirmDelete}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? t("deleting") : t("deleteConfirmButton")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
