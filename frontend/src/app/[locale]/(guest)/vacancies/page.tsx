import type { Metadata } from "next";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getVacancyListFromServer } from "@/lib/api/server";
import { buildCanonicalUrl, getAlternateLanguages } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import type { Vacancy } from "@/lib/api/vacancies";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title = t("vacanciesTitle", { siteName: siteConfig.name });
  const description = t("vacanciesDescription", { siteName: siteConfig.name });
  const pathname = "/vacancies";

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

export default async function VacanciesPage() {
  const vacancies = await getVacancyListFromServer();

  return <VacanciesPageView vacancies={vacancies} />;
}

// Split out so useTranslations (a hook) isn't called inside the async
// VacanciesPage above — same async-page-then-sync-view split used by
// faq/page.tsx and terms/page.tsx.
function VacanciesPageView({ vacancies }: { vacancies: Vacancy[] }) {
  const t = useTranslations("Vacancies");
  const locale = useLocale() as "ka" | "en" | "ru";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>

      {vacancies.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {vacancies.map((vacancy) => {
            const title = vacancy.title[locale] || vacancy.title.ka;
            const description = vacancy.description[locale] || vacancy.description.ka;
            const excerpt = stripHtml(description).slice(0, 160);
            return (
              <Link
                key={vacancy.id}
                href={`/vacancies/${vacancy.slug}`}
                className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <p className="font-semibold text-foreground">{title}</p>
                {excerpt && <p className="mt-2 text-sm text-muted-foreground">{excerpt}</p>}
                <span className="mt-3 inline-block text-sm font-semibold text-primary">
                  {t("viewDetails")}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
