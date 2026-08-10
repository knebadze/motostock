"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Modal } from "@/components/shared/Modal";
import { getTerms } from "@/lib/api/terms";
import { sanitizeRichText } from "@/lib/sanitize-html";

export function TermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("Terms");
  const locale = useLocale() as "ka" | "en" | "ru";
  const [content, setContent] = useState<string | null>(null);
  const loading = open && content === null;

  useEffect(() => {
    if (!open || content !== null) return;

    getTerms()
      .then((terms) => setContent(terms.content[locale]))
      .catch(() => setContent(""));
  }, [open, content, locale]);

  return (
    <Modal open={open} onClose={onClose} title={t("title")} size="xl">
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
