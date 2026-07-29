import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { RootShell } from "@/components/shared/RootShell";
import { getAlternateLanguages, getSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/config/site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("title", { siteName: siteConfig.name }),
    description: t("description"),
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: getAlternateLanguages("/")[locale],
      languages: getAlternateLanguages("/"),
    },
  };
}

function OrganizationJsonLd() {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteUrl,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <RootShell lang={locale}>
      <OrganizationJsonLd />
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </RootShell>
  );
}
