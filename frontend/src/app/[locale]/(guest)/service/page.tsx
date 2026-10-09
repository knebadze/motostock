import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCompanyInfoFromServer, getPublicServiceTypesFromServer } from "@/lib/api/server";
import { buildCanonicalUrl, getAlternateLanguages, getSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { localizedLookupName } from "@/lib/api/lookups";
import type { WeekDay } from "@/lib/api/company-info";
import { JsonLd } from "@/components/shared/JsonLd";
import { buildSocialMetadata } from "@/lib/share-metadata";

type Locale = "ka" | "en" | "ru";

// How many service names go into the meta description before it gets too
// long for a search snippet (~155 characters).
const DESCRIPTION_SERVICE_NAMES = 4;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const serviceTypes = await getPublicServiceTypesFromServer();
  const names = serviceTypes
    .slice(0, DESCRIPTION_SERVICE_NAMES)
    .map((serviceType) => serviceType.name[locale as Locale]);

  const title = t("serviceTitle", { siteName: siteConfig.name });
  const description =
    names.length > 0
      ? t("serviceDescription", { siteName: siteConfig.name, services: names.join(", ") })
      : t("serviceDescriptionGeneric", { siteName: siteConfig.name });
  const pathname = "/service";

  return {
    title,
    description,
    alternates: {
      canonical: buildCanonicalUrl(pathname, locale),
      languages: getAlternateLanguages(pathname),
    },
    ...(await buildSocialMetadata({ locale, title, description, pathname })),
  };
}

const WEEK_DAY_KEYS: Record<WeekDay, string> = {
  MONDAY: "monday",
  TUESDAY: "tuesday",
  WEDNESDAY: "wednesday",
  THURSDAY: "thursday",
  FRIDAY: "friday",
  SATURDAY: "saturday",
  SUNDAY: "sunday",
};

const wrenchIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9Z" />
  </svg>
);

const clockIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

// The service center's own page — what the workshop does (the admin's
// active "სერვისების ტიპები", in their order), working hours and how to book.
// The shop's local-search pages were all retail until now; this is the page
// a "motorcycle service" search can land on. Service JSON-LD describes the
// same list for search engines.
export default async function ServicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const localeKey = locale as Locale;
  const [t, tContact, companyInfo, serviceTypes] = await Promise.all([
    getTranslations({ locale, namespace: "Service" }),
    getTranslations({ locale, namespace: "Contact" }),
    getCompanyInfoFromServer(),
    getPublicServiceTypesFromServer(),
  ]);

  const siteUrl = getSiteUrl();
  const businessName = companyInfo.name || siteConfig.name;
  const cityName = companyInfo.city ? localizedLookupName(companyInfo.city, locale) : null;
  const address = [cityName, companyInfo.street].filter(Boolean).join(", ");
  const openHours = companyInfo.workingHours;

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: t("title"),
    serviceType: t("title"),
    url: buildCanonicalUrl("/service", locale),
    provider: {
      "@type": "LocalBusiness",
      name: businessName,
      url: siteUrl,
      ...(companyInfo.phone ? { telephone: companyInfo.phone } : {}),
      ...(companyInfo.street || cityName
        ? {
            address: {
              "@type": "PostalAddress",
              ...(companyInfo.street ? { streetAddress: companyInfo.street } : {}),
              ...(cityName ? { addressLocality: cityName } : {}),
              addressCountry: "GE",
            },
          }
        : {}),
    },
    areaServed: cityName ? { "@type": "City", name: cityName } : { "@type": "Country", name: "Georgia" },
    ...(serviceTypes.length > 0
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: t("servicesHeading"),
            itemListElement: serviceTypes.map((serviceType) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: serviceType.name[localeKey] },
            })),
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd data={serviceJsonLd} />

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">{t("intro")}</p>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-text">
              {wrenchIcon}
            </span>
            <h2 className="text-lg font-semibold">{t("servicesHeading")}</h2>
          </div>
          {serviceTypes.length > 0 ? (
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {serviceTypes.map((serviceType) => (
                <li
                  key={serviceType.id}
                  className="rounded-lg border border-border/60 px-3 py-2 text-sm font-medium text-foreground"
                >
                  {serviceType.name[localeKey]}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t("noServices")}</p>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("contactHeading")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("contactText")}</p>
            {address && <p className="mt-3 text-sm font-medium text-foreground">{address}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {companyInfo.phone && (
                <a
                  href={`tel:${companyInfo.phone}`}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  {t("callButton")} · {companyInfo.phone}
                </a>
              )}
              <Link
                href="/contact"
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-text"
              >
                {t("contactLink")}
              </Link>
            </div>
          </section>

          {openHours.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-text">
                  {clockIcon}
                </span>
                <h2 className="text-lg font-semibold">{tContact("hoursLabel")}</h2>
              </div>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                {openHours.map((hour) => (
                  <li
                    key={hour.dayOfWeek}
                    className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-foreground">{tContact(WEEK_DAY_KEYS[hour.dayOfWeek])}</span>
                    <span className={hour.isClosed ? "text-muted-foreground" : "font-medium text-foreground"}>
                      {hour.isClosed ? tContact("closed") : `${hour.openTime} – ${hour.closeTime}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">{t("partsHeading")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("partsText")}</p>
            <Link
              href="/account/garage"
              className="mt-4 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-text"
            >
              {t("partsLink")}
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
