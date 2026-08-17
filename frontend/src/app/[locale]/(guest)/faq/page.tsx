import { useLocale, useTranslations } from "next-intl";
import { getFaqListFromServer } from "@/lib/api/server";
import { sanitizeRichText } from "@/lib/sanitize-html";
import type { Faq } from "@/lib/api/faq";

export default async function FaqPage() {
  const faqs = await getFaqListFromServer();
  return <FaqPageView faqs={faqs} />;
}

// Split out so useTranslations (a hook) isn't called inside the async
// FaqPage above — same async-page-then-sync-view split used by terms/page.tsx.
function FaqPageView({ faqs }: { faqs: Faq[] }) {
  const t = useTranslations("Faq");
  const locale = useLocale() as "ka" | "en" | "ru";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>

      {faqs.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {faqs.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-xl border border-border bg-card p-4 open:pb-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground">
                {faq.question[locale] || faq.question.ka}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div
                className="mt-3 text-sm leading-6 text-muted-foreground [&_a]:text-primary [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:mb-3 [&_ul]:list-disc"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichText(faq.answer[locale] || faq.answer.ka),
                }}
              />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
