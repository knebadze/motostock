import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { getCompanyInfoFromServer } from "@/lib/api/server";
import { facebookIcon, instagramIcon, tiktokIcon, youtubeIcon } from "@/components/shared/social-icons";
import { resolveMediaUrl } from "@/lib/api/client";
import type { CompanyInfo, WeekDay } from "@/lib/api/company-info";

export default async function ContactPage() {
  const companyInfo = await getCompanyInfoFromServer();
  return <ContactPageView companyInfo={companyInfo} />;
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

const pinIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
    <path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const phoneIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.4 2.1L8 10a16 16 0 0 0 6 6l1.3-1.4a2 2 0 0 1 2.1-.4c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
  </svg>
);

const mailIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 8.9 6.2a2 2 0 0 0 2.2 0L22 7" />
  </svg>
);

const clockIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

function InfoCard({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-1 text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

function ContactPageView({ companyInfo }: { companyInfo: CompanyInfo }) {
  const t = useTranslations("Contact");
  const logoUrl = resolveMediaUrl(companyInfo.logoUrl);
  const address = [companyInfo.city?.nameKa, companyInfo.street].filter(Boolean).join(", ");
  const socialLinks = [
    { href: companyInfo.facebookUrl, icon: facebookIcon, label: "Facebook" },
    { href: companyInfo.instagramUrl, icon: instagramIcon, label: "Instagram" },
    { href: companyInfo.youtubeUrl, icon: youtubeIcon, label: "YouTube" },
    { href: companyInfo.tiktokUrl, icon: tiktokIcon, label: "TikTok" },
  ].filter((social): social is { href: string; icon: typeof facebookIcon; label: string } =>
    Boolean(social.href),
  );
  const hasMap = companyInfo.latitude != null && companyInfo.longitude != null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyInfo.name} className="h-14 w-auto object-contain" />
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          {companyInfo.name && <p className="mt-1 text-muted-foreground">{companyInfo.name}</p>}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-4">
          {address && (
            <InfoCard icon={pinIcon} label={t("addressLabel")}>
              {address}
            </InfoCard>
          )}

          {companyInfo.phone && (
            <InfoCard icon={phoneIcon} label={t("phoneLabel")}>
              <a href={`tel:${companyInfo.phone}`} className="transition-colors hover:text-primary">
                {companyInfo.phone}
              </a>
            </InfoCard>
          )}

          {companyInfo.email && (
            <InfoCard icon={mailIcon} label={t("emailLabel")}>
              <a href={`mailto:${companyInfo.email}`} className="transition-colors hover:text-primary">
                {companyInfo.email}
              </a>
            </InfoCard>
          )}

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {clockIcon}
              </span>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("hoursLabel")}
              </p>
            </div>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {companyInfo.workingHours.map((hour) => (
                <li
                  key={hour.dayOfWeek}
                  className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-foreground">{t(WEEK_DAY_KEYS[hour.dayOfWeek])}</span>
                  <span className={hour.isClosed ? "text-muted-foreground" : "font-medium text-foreground"}>
                    {hour.isClosed ? t("closed") : `${hour.openTime} – ${hour.closeTime}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {socialLinks.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("followUsLabel")}
              </p>
              <div className="mt-3 flex gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {hasMap && (
          <div className="min-h-80 overflow-hidden rounded-2xl border border-border">
            <iframe
              title={t("addressLabel")}
              src={`https://www.google.com/maps?q=${companyInfo.latitude},${companyInfo.longitude}&output=embed`}
              className="h-full min-h-80 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </div>
  );
}
