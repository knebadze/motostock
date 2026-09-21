import type { Metadata } from "next";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getPrivacyPolicyFromServer } from "@/lib/api/server";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { buildCanonicalUrl, getAlternateLanguages } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import type { PrivacyPolicy } from "@/lib/api/privacy-policy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title = t("privacyTitle", { siteName: siteConfig.name });
  const description = t("privacyDescription", { siteName: siteConfig.name });
  const pathname = "/privacy";

  return {
    title,
    description,
    alternates: {
      canonical: buildCanonicalUrl(pathname, locale),
      languages: getAlternateLanguages(pathname),
    },
    openGraph: { title, description },
  };
}

export default async function PrivacyPolicyPage() {
  const privacyPolicy = await getPrivacyPolicyFromServer();
  return <PrivacyPolicyPageView privacyPolicy={privacyPolicy} />;
}

// Split out so useTranslations (a hook) isn't called inside the async
// PrivacyPolicyPage above — same async-page-then-sync-view split used by
// terms/page.tsx and faq/page.tsx.
function PrivacyPolicyPageView({ privacyPolicy }: { privacyPolicy: PrivacyPolicy }) {
  const t = useTranslations("PrivacyPolicy");
  const locale = useLocale() as "ka" | "en" | "ru";
  const content = privacyPolicy.content[locale];

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
