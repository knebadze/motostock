import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/shared/Logo";
import { NewsletterSignupForm } from "@/components/shared/NewsletterSignupForm";
import { getCompanyInfoFromServer } from "@/lib/api/server";
import { facebookIcon, instagramIcon, locationIcon, tiktokIcon, youtubeIcon } from "@/components/shared/social-icons";
import { groupWorkingHours } from "@/lib/working-hours";
import { localizedLookupName } from "@/lib/api/lookups";
import type { CompanyInfo, WeekDay } from "@/lib/api/company-info";

const WEEK_DAY_SHORT_KEYS: Record<WeekDay, string> = {
  MONDAY: "mondayShort",
  TUESDAY: "tuesdayShort",
  WEDNESDAY: "wednesdayShort",
  THURSDAY: "thursdayShort",
  FRIDAY: "fridayShort",
  SATURDAY: "saturdayShort",
  SUNDAY: "sundayShort",
};

const headingClass = "text-xs font-semibold uppercase tracking-[0.14em] text-foreground";

export async function Footer() {
  const companyInfo = await getCompanyInfoFromServer();
  return <FooterView companyInfo={companyInfo} />;
}

// Split out so useTranslations (a hook) isn't called inside the async
// Footer above — react-hooks' rules-of-hooks lint rejects hooks in async
// functions even though next-intl's useTranslations works fine in Server
// Components at runtime.
//
// Layout: brand / newsletter / visit-us columns (service,
// contact, about and vacancies are in the header) ("visit us" shows the showroom's open-now status, address, phone
// and hours); legal links in the bottom bar next to the copyright.
function FooterView({ companyInfo }: { companyInfo: CompanyInfo }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  const cityName = companyInfo.city ? localizedLookupName(companyInfo.city, locale) : null;
  const address = [cityName, companyInfo.street].filter(Boolean).join(", ");
  const socialLinks = [
    { href: companyInfo.facebookUrl, icon: facebookIcon, label: "Facebook" },
    { href: companyInfo.instagramUrl, icon: instagramIcon, label: "Instagram" },
    { href: companyInfo.youtubeUrl, icon: youtubeIcon, label: "YouTube" },
    { href: companyInfo.tiktokUrl, icon: tiktokIcon, label: "TikTok" },
  ].filter((social): social is { href: string; icon: typeof facebookIcon; label: string } => Boolean(social.href));
  const workingHoursGroups = groupWorkingHours(companyInfo.workingHours);
  const hasMapLocation = companyInfo.latitude != null && companyInfo.longitude != null;

  // Bottom bar: FAQ and delivery/returns sit with the legal pages.
  const legalLinks = [
    { href: "/faq", label: t("faqTitle") },
    { href: "/shipping", label: t("shippingTitle") },
    { href: "/terms", label: t("termsTitle") },
    { href: "/privacy", label: t("privacyTitle") },
  ];

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:grid-cols-2 sm:gap-8 sm:px-6 lg:grid-cols-[1fr_1.3fr_1fr] lg:gap-12 lg:px-8">
        {/* Brand */}
        <div>
          <Logo className="h-9 w-auto" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("description")}</p>
          <div className="mt-4 flex gap-2">
            {/* Where we are — the contact page's map (just the page when no
                coordinates are set, since the map only renders with them). */}
            <Link
              href={hasMapLocation ? "/contact#map" : "/contact"}
              aria-label={t("locationLabel")}
              title={t("locationLabel")}
              className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary-text"
            >
              {locationIcon}
            </Link>
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary-text"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Newsletter — the middle column from lg; on tablets it spans the
            row under brand + visit us, on phones it follows the brand. */}
        <div className="sm:order-3 sm:col-span-2 lg:order-none lg:col-span-1">
          <h3 className="text-base font-semibold text-foreground">{t("newsletterHeading")}</h3>
          <div className="mt-4">
            <NewsletterSignupForm />
          </div>
        </div>

        {/* Visit us — pushed to the right edge from sm up (the block keeps
            its own left-aligned text). */}
        <div className="sm:justify-self-end">
          <h3 className={headingClass}>{t("visitTitle")}</h3>
          <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
            {companyInfo.workingHours.length > 0 && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                <span
                  className={`size-1.5 rounded-full ${companyInfo.isOpenNow ? "bg-success" : "bg-destructive"}`}
                  aria-hidden
                />
                {companyInfo.isOpenNow ? t("openNow") : t("closedNow")}
              </span>
            )}
            {address && <span>{address}</span>}
            {companyInfo.phone && (
              <a
                href={`tel:${companyInfo.phone}`}
                className="w-fit font-semibold text-foreground transition-colors hover:text-primary-text"
              >
                {companyInfo.phone}
              </a>
            )}
            {companyInfo.email && (
              <a href={`mailto:${companyInfo.email}`} className="w-fit transition-colors hover:text-primary-text">
                {companyInfo.email}
              </a>
            )}
            {workingHoursGroups.map((group) => (
              <span key={`${group.firstDay}-${group.lastDay}`}>
                {t(WEEK_DAY_SHORT_KEYS[group.firstDay])}
                {group.firstDay !== group.lastDay && `–${t(WEEK_DAY_SHORT_KEYS[group.lastDay])}`}:{" "}
                {group.isClosed ? t("hoursClosed") : `${group.openTime} – ${group.closeTime}`}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar: copyright + the four info/legal links, divided by faint
          lines. Below lg the links form a tidy 2×2 grid (cell borders via
          gap-px on a border-colored background) with the copyright centered
          under it; from lg one line — copyright left, links right. */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 text-xs text-muted-foreground sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8">
          <span className="order-2 text-center lg:order-1 lg:text-left">
            © {year} {siteConfig.name}. {t("rights")}
          </span>
          <nav
            aria-label={t("legalNavLabel")}
            className="order-1 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:order-2 lg:flex lg:gap-0 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent"
          >
            {legalLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center bg-card px-3 py-3 text-center transition-colors hover:text-primary-text lg:border-l lg:border-border lg:bg-transparent lg:px-4 lg:py-0 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
