"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { loginUser } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";
import { OAuthButtons } from "@/components/shared/OAuthButtons";

// The ?redirect= param is attacker-controlled (a crafted /login?redirect=...
// link) — only accept a same-site relative path (single leading slash, not
// "//" or "https://" which browsers treat as protocol-relative/absolute) to
// avoid an open-redirect after a successful login.
function resolveRedirectTarget(value: string | null): string {
  return value && /^\/(?!\/)/.test(value) ? value : "/account";
}

export function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "oauth_failed") {
      toast.error(t("oauthError"));
      router.replace(pathname);
    } else if (error === "oauth_email_has_password") {
      // Backend deliberately refused to auto-link this Google/Facebook
      // account onto an existing password-protected one — see
      // oauth.service.ts's findOrCreateOAuthUser. The fix here is just
      // telling the user to use their password instead, not a client-side
      // retry of anything.
      toast.error(t("oauthEmailHasPassword"));
      router.replace(pathname);
    }
    // Only meant to run once, reacting to the initial query param — re-running
    // on every pathname/router identity change would re-fire the toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      await loginUser({ email, password });
      router.push(resolveRedirectTarget(searchParams.get("redirect")));
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
          <Link
            href="/forgot-password"
            className="self-end text-xs font-medium text-primary hover:underline"
          >
            {t("forgotPasswordLink")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? t("loginSubmitting") : t("loginSubmit")}
        </button>

        <OAuthButtons />

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
