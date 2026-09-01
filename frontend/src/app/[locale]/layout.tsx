import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { RootShell } from "@/components/shared/RootShell";
import { getAlternateLanguages, getSiteUrl, jsonLdScriptProps } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { getCompanyInfoFromServer } from "@/lib/api/server";
import { resolveMediaUrl } from "@/lib/api/client";
import type { WeekDay } from "@/lib/api/company-info";

const DAY_OF_WEEK_SCHEMA: Record<WeekDay, string> = {
  MONDAY: "https://schema.org/Monday",
  TUESDAY: "https://schema.org/Tuesday",
  WEDNESDAY: "https://schema.org/Wednesday",
  THURSDAY: "https://schema.org/Thursday",
  FRIDAY: "https://schema.org/Friday",
  SATURDAY: "https://schema.org/Saturday",
  SUNDAY: "https://schema.org/Sunday",
};

function cityNameKey(locale: string): "nameKa" | "nameEn" | "nameRu" {
  return locale === "ka" ? "nameKa" : locale === "ru" ? "nameRu" : "nameEn";
}

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
    // Site-wide fallback so every page shares at least a title/description
    // when shared on Facebook/Slack/Twitter/etc. — pages with their own
    // content (product/vehicle/category) override this with a richer,
    // per-item openGraph block. No default `images` here: the only brand
    // asset on hand (public/logo.svg) is a white-on-transparent SVG that
    // social crawlers either skip or render invisible on a light card —
    // add a real raster (PNG/JPG) share image here once one exists.
    openGraph: {
      title,
      description,
      siteName: siteConfig.name,
      locale,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
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
  const cityName = companyInfo.city?.[cityNameKey(locale)];

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

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(jsonLd)} />
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
      <LocalBusinessJsonLd locale={locale} />
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </RootShell>
  );
}
