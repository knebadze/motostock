import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getCategoriesFromServer } from "@/lib/api/server";
import { resolveMediaUrl } from "@/lib/api/client";
import type { Category } from "@/lib/api/categories";

export default async function CatalogPage() {
  const categories = await getCategoriesFromServer();
  return <CatalogPageView categories={categories} />;
}

function childrenOf(categories: Category[], parentId: number | null) {
  return categories
    .filter((category) => category.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// One card style reused at every depth (subcategories and their own
// children look identical) — which category it belongs to is conveyed by
// the section heading it sits under (see CategoryGroups), not by a
// different/smaller card style.
function CategoryCard({ category, locale }: { category: Category; locale: "ka" | "en" | "ru" }) {
  const imageUrl = resolveMediaUrl(category.imageUrl);

  return (
    <Link
      href={`/${category.slug}`}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
    >
      {imageUrl ? (
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border">
          <Image src={imageUrl} alt={category.name[locale]} fill sizes="48px" className="object-cover" />
        </div>
      ) : (
        <div className="size-12 shrink-0 rounded-lg border border-dashed border-border" />
      )}
      <span className="font-semibold text-foreground transition-colors group-hover:text-primary">
        {category.name[locale]}
      </span>
    </Link>
  );
}

// Recursively renders every deeper level as its own "<parent name> heading +
// card grid" group — the tree currently reaches 3 levels (category →
// subcategory → sub-subcategory), but this doesn't hardcode that: a 4th
// level would just add another heading+grid nested under its parent's
// group without any change here.
function CategoryGroups({
  parentId,
  categories,
  locale,
}: {
  parentId: number;
  categories: Category[];
  locale: "ka" | "en" | "ru";
}) {
  const children = childrenOf(categories, parentId);

  return (
    <>
      {children.map((child) => {
        const grandchildren = childrenOf(categories, child.id);
        if (grandchildren.length === 0) return null;

        return (
          <div key={child.id} className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {child.name[locale]}
            </h3>
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grandchildren.map((grandchild) => (
                <CategoryCard key={grandchild.id} category={grandchild} locale={locale} />
              ))}
            </div>
            <CategoryGroups parentId={child.id} categories={categories} locale={locale} />
          </div>
        );
      })}
    </>
  );
}

function CatalogPageView({ categories }: { categories: Category[] }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Catalog");

  const topLevel = childrenOf(categories, null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>

      {topLevel.length > 1 && (
        <nav className="mt-6 flex flex-wrap gap-2">
          {topLevel.map((category) => (
            <a
              key={category.id}
              href={`#${category.slug}`}
              className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {category.name[locale]}
            </a>
          ))}
        </nav>
      )}

      <div className="mt-10 flex flex-col gap-14">
        {topLevel.map((category) => {
          const bannerUrl = resolveMediaUrl(category.bannerImageUrl ?? category.imageUrl);
          const subcategories = childrenOf(categories, category.id);

          return (
            <section key={category.id} id={category.slug} className="scroll-mt-24">
              <Link
                href={`/${category.slug}`}
                className="group relative flex min-h-32 items-center overflow-hidden rounded-2xl border border-border"
              >
                {bannerUrl ? (
                  <>
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${bannerUrl})` }}
                    />
                    {/* Flat scrim (not a gradient) — same treatment as
                        ShopHero.tsx, for visual consistency with the
                        category pages these cards link to. */}
                    <div className="absolute inset-0 bg-black/50" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-muted/60" />
                )}
                <div className="relative flex w-full items-center justify-between gap-4 px-6 py-6 sm:px-8">
                  <div>
                    <h2
                      className={`text-xl font-bold tracking-tight sm:text-2xl ${
                        bannerUrl ? "text-white drop-shadow-md" : "text-foreground"
                      }`}
                    >
                      {category.name[locale]}
                    </h2>
                    {subcategories.length > 0 && (
                      <p className={`mt-1 text-sm ${bannerUrl ? "text-white/80" : "text-muted-foreground"}`}>
                        {t("subcategoryCount", { count: subcategories.length })}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold transition-colors group-hover:underline ${
                      bannerUrl ? "text-white" : "text-primary"
                    }`}
                  >
                    {t("viewAll")} →
                  </span>
                </div>
              </Link>

              {subcategories.length > 0 && (
                <div className="mt-5 grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {subcategories.map((subcategory) => (
                    <CategoryCard key={subcategory.id} category={subcategory} locale={locale} />
                  ))}
                </div>
              )}

              <CategoryGroups parentId={category.id} categories={categories} locale={locale} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
