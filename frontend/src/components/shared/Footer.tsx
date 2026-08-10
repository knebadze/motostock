import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/shared/Logo";
import { getCategoriesFromServer, getCompanyInfoFromServer } from "@/lib/api/server";
import { facebookIcon, instagramIcon, tiktokIcon, youtubeIcon } from "@/components/shared/social-icons";
import type { CompanyInfo } from "@/lib/api/company-info";
import type { Category } from "@/lib/api/categories";

export async function Footer() {
  const [companyInfo, categories] = await Promise.all([
    getCompanyInfoFromServer(),
    getCategoriesFromServer(),
  ]);
  return <FooterView companyInfo={companyInfo} categories={categories} />;
}

// Split out so useTranslations (a hook) isn't called inside the async
// Footer above — react-hooks' rules-of-hooks lint rejects hooks in async
// functions even though next-intl's useTranslations works fine in Server
// Components at runtime. Same async-page-then-sync-view split already used
// by account/page.tsx's AccountDashboardPage → AccountDashboardView.
function FooterView({
  companyInfo,
  categories,
}: {
  companyInfo: CompanyInfo;
  categories: Category[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const tFooter = useTranslations("Footer");
  const year = new Date().getFullYear();

  // Same DB-driven parent-category derivation as Header.tsx's mega menu —
  // already sorted by Category.sortOrder (see categories.repository.ts's
  // orderBy), so no re-sort needed here.
  const topLevelCategories = categories.filter((category) => category.parentId === null);

  const address = [companyInfo.city?.nameKa, companyInfo.street].filter(Boolean).join(", ");
  const socialLinks = [
    { href: companyInfo.facebookUrl, icon: facebookIcon, label: "Facebook" },
    { href: companyInfo.instagramUrl, icon: instagramIcon, label: "Instagram" },
    { href: companyInfo.youtubeUrl, icon: youtubeIcon, label: "YouTube" },
    { href: companyInfo.tiktokUrl, icon: tiktokIcon, label: "TikTok" },
  ].filter((social): social is { href: string; icon: typeof facebookIcon; label: string } =>
    Boolean(social.href),
  );

  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo className="h-9 w-auto" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            {tFooter("description")}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">{tFooter("catalogTitle")}</h3>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
            {topLevelCategories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/${category.slug}`}
                  className="transition-colors hover:text-primary"
                >
                  {category.name[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">{tFooter("companyTitle")}</h3>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">
                {tFooter("aboutUs")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="transition-colors hover:text-primary">
                {tFooter("contactTitle")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="transition-colors hover:text-primary">
                {tFooter("termsTitle")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">{tFooter("contactTitle")}</h3>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
            {address && <li>{address}</li>}
            {companyInfo.phone && <li>{companyInfo.phone}</li>}
            {companyInfo.email && <li>{companyInfo.email}</li>}
          </ul>
          {socialLinks.length > 0 && (
            <div className="mt-4 flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
        © {year} {siteConfig.name}. {tFooter("rights")}
      </div>
    </footer>
  );
}
