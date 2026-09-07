"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Modal } from "@/components/shared/Modal";
import { getTerms } from "@/lib/api/terms";
import type { LocalizedString } from "@/lib/api/categories";
import { sanitizeRichText } from "@/lib/sanitize-html";

export function TermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("Terms");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as "ka" | "en" | "ru";
  // Caches the full trilingual response (the fetch itself doesn't depend on
  // locale — getTerms() always returns all three languages in one call), not
  // just the already-indexed-by-locale string. Re-indexing by `locale` at
  // render time means a locale switch while this modal instance's state
  // survives (it's mounted persistently inside RegisterForm, toggled via
  // `open` rather than being remounted per-open) always shows the current
  // language immediately, instead of the previously-cached one string
  // silently staying stuck until state resets.
  const [terms, setTerms] = useState<LocalizedString | null>(null);
  const loading = open && terms === null;

  useEffect(() => {
    if (!open || terms !== null) return;

    getTerms()
      .then((result) => setTerms(result.content))
      .catch(() => setTerms({ ka: "", en: "", ru: "" }));
  }, [open, terms]);

  const content = terms?.[locale] ?? "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("title")}
      size="xl"
      closeLabel={tCommon("modal.close")}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : content ? (
        <div
          className="text-base leading-7 text-foreground [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:mb-4 [&_ul]:list-disc"
          // Admin-authored rich text — sanitized regardless as
          // defense-in-depth (see sanitizeRichText).
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(content) }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}
    </Modal>
  );
}
