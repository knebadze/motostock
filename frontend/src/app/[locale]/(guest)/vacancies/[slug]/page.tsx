import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getVacancyBySlugFromServer } from "@/lib/api/server";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { buildCanonicalUrl, getAlternateLanguages } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import type { Vacancy } from "@/lib/api/vacancies";

type Locale = "ka" | "en" | "ru";
type PageParams = { locale: Locale; slug: string };

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const vacancy = await getVacancyBySlugFromServer(slug);
  if (!vacancy) return {};

  const title = `${vacancy.title[locale] || vacancy.title.ka} — ${siteConfig.name}`;
  const rawDescription = vacancy.description[locale] || vacancy.description.ka;
  const description = stripHtml(rawDescription).slice(0, 200) || title;
  const pathname = `/vacancies/${slug}`;

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

export default async function VacancyDetailPage({ params }: { params: Promise<PageParams> }) {
  const { slug } = await params;
  const vacancy = await getVacancyBySlugFromServer(slug);
  if (!vacancy) {
    notFound();
  }

  return <VacancyDetailPageView vacancy={vacancy} />;
}

// Split out so useTranslations (a hook) isn't called inside the async
// VacancyDetailPage above — same async-page-then-sync-view split used by
// faq/page.tsx and terms/page.tsx.
function VacancyDetailPageView({ vacancy }: { vacancy: Vacancy }) {
  const t = useTranslations("Vacancies");
  const locale = useLocale() as Locale;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/vacancies" className="text-sm font-semibold text-primary hover:underline">
        ← {t("backToList")}
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        {vacancy.title[locale] || vacancy.title.ka}
      </h1>

      <div
        className="mt-6 text-sm leading-6 text-muted-foreground [&_a]:text-primary [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:mb-3 [&_ul]:list-disc"
        dangerouslySetInnerHTML={{
          __html: sanitizeRichText(vacancy.description[locale] || vacancy.description.ka),
        }}
      />
    </div>
  );
}
