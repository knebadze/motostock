import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";
import {
  getCategoriesFromServer,
  getMyGarageFromServer,
  getPublicHeroSlidesFromServer,
  getVehicleCatalogFromServer,
} from "@/lib/api/server";
import { HeroSlider } from "@/components/home/HeroSlider";

const navCategories = siteConfig.nav.filter((item) => item.href !== "/");

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });

  const slides = await getPublicHeroSlidesFromServer();
  // Only fetched when actually needed — most homepage loads won't have a
  // VEHICLE_SEARCH/CATEGORY_FILTER slide configured, so these stay no-op by
  // default.
  const hasVehicleSearchSlide = slides.some((slide) => slide.type === "VEHICLE_SEARCH");
  const [vehicleCatalog, garageVehicles] = hasVehicleSearchSlide
    ? await Promise.all([getVehicleCatalogFromServer(), getMyGarageFromServer()])
    : [[], []];
  const allCategories = slides.some((slide) => slide.type === "CATEGORY_FILTER")
    ? await getCategoriesFromServer()
    : [];

  return (
    <>
      {slides.length > 0 ? (
        <HeroSlider
          slides={slides}
          vehicleCatalog={vehicleCatalog}
          garageVehicles={garageVehicles}
          categories={allCategories}
        />
      ) : (
        // Fallback for before any slide is configured (or all disabled) — the
        // original static hero, unchanged, so the homepage is never empty.
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
      )}

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">
          {t("categoriesTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {navCategories.map((category) => (
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
