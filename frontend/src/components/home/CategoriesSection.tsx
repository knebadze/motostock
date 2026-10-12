import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Category } from "@/lib/api/categories";

// Compact tinted tiles (no images — the page around it is image-heavy
// already): the name, "N products" (rolled up over subcategories, so it
// reads the same whether the section shows a parent or a subcategory) and a
// round arrow; 2 per row on phones, 3 on larger screens. Same heading
// rhythm/spacing as the carousels around it.
export async function CategoriesSection({
  title,
  categories,
  itemCounts,
  locale,
}: {
  title: string;
  categories: Category[];
  // Storefront item count per category id (subtree total).
  itemCounts: Record<number, number>;
  locale: "ka" | "en" | "ru";
}) {
  if (categories.length === 0) return null;
  const tHome = await getTranslations({ locale, namespace: "Home" });

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <Link href="/catalog" className="shrink-0 text-sm font-semibold text-primary-text hover:underline">
          {tHome("browseCatalog")} →
        </Link>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/${category.slug}`}
              className="group flex items-center justify-between gap-3 rounded-2xl bg-primary/5 px-4 py-4 transition-colors hover:bg-primary/10"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground sm:text-base">
                  {category.name[locale]}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {tHome("categoryItemCount", { count: itemCounts[category.id] ?? 0 })}
                </span>
              </span>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-primary-text shadow-sm transition-transform group-hover:translate-x-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
