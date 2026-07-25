"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Error");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("heading")}
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          {t("description")}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
