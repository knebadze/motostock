import { useLocale, useTranslations } from "next-intl";
import { getTermsFromServer } from "@/lib/api/server";
import { sanitizeRichText } from "@/lib/sanitize-html";
import type { Terms } from "@/lib/api/terms";

export default async function TermsPage() {
  const terms = await getTermsFromServer();
  return <TermsPageView terms={terms} />;
}

// Split out so useTranslations (a hook) isn't called inside the async
// TermsPage above — same async-page-then-sync-view split used by
// contact/page.tsx's ContactPage → ContactPageView.
function TermsPageView({ terms }: { terms: Terms }) {
  const t = useTranslations("Terms");
  const locale = useLocale() as "ka" | "en" | "ru";
  const content = terms.content[locale];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>

      {content ? (
        <div
          className="mt-8 text-base leading-7 text-foreground [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:mb-4 [&_ul]:list-disc"
          // Admin-authored rich text — sanitized regardless as
          // defense-in-depth (see sanitizeRichText).
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(content) }}
        />
      ) : (
        <p className="mt-8 text-muted-foreground">{t("empty")}</p>
      )}
    </div>
  );
}
