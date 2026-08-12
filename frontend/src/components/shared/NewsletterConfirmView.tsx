"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { confirmNewsletterSubscription } from "@/lib/api/newsletter";

type Status = "loading" | "success" | "error";

export function NewsletterConfirmView() {
  const t = useTranslations("Newsletter");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "loading" : "error");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    confirmNewsletterSubscription(token)
      .then(() => {
        if (!cancelled) setStatus("success");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
      <h1 className="text-xl font-bold tracking-tight">{t("confirmTitle")}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {status === "loading"
          ? t("confirmLoading")
          : status === "success"
            ? t("confirmSuccess")
            : t("confirmError")}
      </p>
      {status !== "loading" && (
        <Link href="/" className="mt-6 inline-block font-semibold text-primary hover:underline">
          {t("backToHome")}
        </Link>
      )}
    </div>
  );
}
