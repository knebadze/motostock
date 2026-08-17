"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { verifyEmail } from "@/lib/api/auth";

type Status = "loading" | "success" | "error";

export function VerifyEmailView() {
  const t = useTranslations("Auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "loading" : "error");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    verifyEmail(token)
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
      <h1 className="text-xl font-bold tracking-tight">{t("verifyEmailTitle")}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {status === "loading"
          ? t("verifyEmailLoading")
          : status === "success"
            ? t("verifyEmailSuccess")
            : t("verifyEmailError")}
      </p>
      {status !== "loading" && (
        <Link
          href={status === "success" ? "/account" : "/"}
          className="mt-6 inline-block font-semibold text-primary hover:underline"
        >
          {status === "success" ? t("verifyEmailGoToAccount") : t("verifyEmailBackToHome")}
        </Link>
      )}
    </div>
  );
}
