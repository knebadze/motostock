import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/shared/Logo";

export function Footer() {
  const t = useTranslations("Nav");
  const tFooter = useTranslations("Footer");
  const year = new Date().getFullYear();

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
            {siteConfig.nav
              .filter((item) => item.href !== "/")
              .map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-primary"
                  >
                    {t(item.key)}
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
              <Link href="/" className="transition-colors hover:text-primary">
                {tFooter("contactTitle")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">{tFooter("contactTitle")}</h3>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
            <li>info@motostock.ge</li>
            <li>+995 5XX XX XX XX</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
        © {year} MotoStock. {tFooter("rights")}
      </div>
    </footer>
  );
}
