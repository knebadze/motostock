"use client";

import { useTranslations } from "next-intl";
import { API_ORIGIN } from "@/lib/api/client";

export function OAuthButtons() {
  const t = useTranslations("Auth");

  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        {t("orContinueWith")}
        <div className="h-px flex-1 bg-border" />
      </div>

      <a
        href={`${API_ORIGIN}/api/auth/google`}
        className="flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4">
          <path
            fill="#4285F4"
            d="M23.766 12.276c0-.818-.074-1.606-.21-2.361H12.24v4.467h6.478a5.54 5.54 0 0 1-2.4 3.632v3.017h3.885c2.276-2.094 3.563-5.176 3.563-8.755Z"
          />
          <path
            fill="#34A853"
            d="M12.24 24c3.24 0 5.956-1.075 7.942-2.909l-3.885-3.017c-1.077.722-2.455 1.147-4.057 1.147-3.12 0-5.76-2.106-6.705-4.936H1.518v3.113A11.997 11.997 0 0 0 12.24 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.535 14.285a7.2 7.2 0 0 1 0-4.57V6.602H1.518a12.01 12.01 0 0 0 0 10.796l4.017-3.113Z"
          />
          <path
            fill="#EA4335"
            d="M12.24 4.78c1.763 0 3.346.606 4.591 1.796l3.444-3.444C18.19 1.19 15.475 0 12.24 0A11.997 11.997 0 0 0 1.518 6.602l4.017 3.113c.945-2.83 3.585-4.935 6.705-4.935Z"
          />
        </svg>
        {t("continueWithGoogle")}
      </a>

      <a
        href={`${API_ORIGIN}/api/auth/facebook`}
        className="flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1877F2" className="size-4">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
        </svg>
        {t("continueWithFacebook")}
      </a>
    </div>
  );
}
