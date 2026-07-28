"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { loginUser } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";

export function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      await loginUser({ email, password });
      router.push("/account");
      router.refresh();
    } catch (error) {
      // The backend's auth error strings are English-only (no server-side
      // i18n for this yet) — map the one status code we know about to a
      // localized message instead of surfacing raw backend text.
      const message =
        error instanceof ApiRequestError
          ? error.status === 401
            ? t("invalidCredentials")
            : error.message
          : t("loginError");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-2xl border border-border bg-card p-8"
    >
      <h1 className="text-xl font-bold tracking-tight">{t("loginTitle")}</h1>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            {t("emailLabel")}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            {t("passwordLabel")}
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? t("loginSubmitting") : t("loginSubmit")}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            {t("goToRegister")}
          </Link>
        </p>
      </div>
    </form>
  );
}
