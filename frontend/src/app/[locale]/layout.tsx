import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { RootShell } from "@/components/shared/RootShell";
import { VisitorPingBeacon } from "@/components/shared/VisitorPingBeacon";
import { GoogleAnalytics } from "@/components/shared/GoogleAnalytics";
import { buildSocialMetadata } from "@/lib/share-metadata";
import { SentryFlagMeta } from "@/components/shared/SentryFlagMeta";
import { JsonLd } from "@/components/shared/JsonLd";
import { getAlternateLanguages, getSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { getCompanyInfoFromServer } from "@/lib/api/server";
import { resolveMediaUrl } from "@/lib/api/client";
import { localizedLookupName } from "@/lib/api/lookups";
import type { WeekDay } from "@/lib/api/company-info";

// Translation namespaces only ever read by SERVER components (via
// getTranslations, or useTranslations in a non-client component) — they get
// their messages from the request config, never from NextIntlClientProvider,
// so shipping them to the browser on every page was pure payload. Listed as
// an exclusion (not a list of client namespaces) so a namespace added later
// reaches client components by default; only list one here after checking
// no "use client" module (or anything it imports) reads it.
const SERVER_ONLY_NAMESPACES = [
  "Metadata",
  "About",
  "Contact",
  "Catalog",
  "PrivacyPolicy",
  "Faq",
  "Vacancies",
  "NotFound",
] as const;

const DAY_OF_WEEK_SCHEMA: Record<WeekDay, string> = {
  MONDAY: "https://schema.org/Monday",
  TUESDAY: "https://schema.org/Tuesday",
  WEDNESDAY: "https://schema.org/Wednesday",
  THURSDAY: "https://schema.org/Thursday",
  FRIDAY: "https://schema.org/Friday",
  SATURDAY: "https://schema.org/Saturday",
  SUNDAY: "https://schema.org/Sunday",
};

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
  const title = t("title", { siteName: siteConfig.name });
  const description = t("description");

  return {
    title,
    description,
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      canonical: getAlternateLanguages("/")[locale],
      languages: getAlternateLanguages("/"),
    },
    // Site-wide fallback for pages without their own (home included): the
    // shop logo from admin → company info as the preview image — see
    // lib/share-metadata.ts.
    ...(await buildSocialMetadata({ locale, title, description, pathname: "/" })),
  };
}

// LocalBusiness (a subtype of Organization) rather than plain Organization —
// unlocks the address/geo/openingHours properties Google looks for in a
// local-pack/Knowledge Panel result, which plain Organization doesn't carry.
// Falls back to just name+url when company-info fields aren't filled in
// (admin panel), same graceful-degradation approach as the rest of this
// component's optional properties.
async function LocalBusinessJsonLd({ locale }: { locale: string }) {
  const siteUrl = getSiteUrl();
  const companyInfo = await getCompanyInfoFromServer();
  const logoUrl = resolveMediaUrl(companyInfo.logoUrl);
  const cityName = companyInfo.city ? localizedLookupName(companyInfo.city, locale) : undefined;

  const address =
    companyInfo.street || cityName
      ? {
          "@type": "PostalAddress",
          ...(companyInfo.street ? { streetAddress: companyInfo.street } : {}),
          ...(cityName ? { addressLocality: cityName } : {}),
          addressCountry: "GE",
        }
      : undefined;

  const geo =
    companyInfo.latitude != null && companyInfo.longitude != null
      ? { "@type": "GeoCoordinates", latitude: companyInfo.latitude, longitude: companyInfo.longitude }
      : undefined;

  const openingHoursSpecification = companyInfo.workingHours
    .filter((hour) => !hour.isClosed && hour.openTime && hour.closeTime)
    .map((hour) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_OF_WEEK_SCHEMA[hour.dayOfWeek],
      opens: hour.openTime,
      closes: hour.closeTime,
    }));

  const sameAs = [
    companyInfo.facebookUrl,
    companyInfo.instagramUrl,
    companyInfo.youtubeUrl,
    companyInfo.tiktokUrl,
  ].filter((url): url is string => Boolean(url));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: companyInfo.name || siteConfig.name,
    url: siteUrl,
    ...(logoUrl ? { logo: logoUrl, image: logoUrl } : {}),
    ...(address ? { address } : {}),
    ...(geo ? { geo } : {}),
    ...(companyInfo.phone ? { telephone: companyInfo.phone } : {}),
    ...(companyInfo.email ? { email: companyInfo.email } : {}),
    ...(openingHoursSpecification.length > 0 ? { openingHoursSpecification } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return <JsonLd data={jsonLd} />;
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
  const messages = await getMessages();
  const clientMessages = Object.fromEntries(
    Object.entries(messages).filter(
      ([namespace]) => !(SERVER_ONLY_NAMESPACES as readonly string[]).includes(namespace),
    ),
  );

  return (
    <RootShell lang={locale}>
      {/* company-info fetch (rarely changes) previously blocked every single
          page's initial render (this layout wraps every storefront route).
          Suspense lets the rest of the page stream ahead of it instead —
          `fallback={null}` since this renders no visible UI of its own, only
          a JSON-LD <script> tag. */}
      <Suspense fallback={null}>
        <LocalBusinessJsonLd locale={locale} />
      </Suspense>
      <GoogleAnalytics />
      <SentryFlagMeta />
      <VisitorPingBeacon />
      <NextIntlClientProvider messages={clientMessages}>{children}</NextIntlClientProvider>
    </RootShell>
  );
}
