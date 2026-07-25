import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";

const categories = siteConfig.nav.filter((item) => item.href !== "/");

export default function HomePage() {
  const t = useTranslations("Home");
  const tNav = useTranslations("Nav");

  return (
    <>
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-24 sm:px-6 lg:px-8">
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t.rich("heroTitle", {
              hl: (chunks) => <span className="text-primary">{chunks}</span>,
            })}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            {t("heroSubtitle")}
          </p>
          <Link
            href="/helmets"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {t("browseCatalog")}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">
          {t("categoriesTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary"
            >
              <span className="text-lg font-semibold transition-colors group-hover:text-primary">
                {tNav(category.key)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
