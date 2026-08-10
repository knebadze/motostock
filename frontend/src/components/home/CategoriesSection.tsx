import { Link } from "@/i18n/navigation";
import type { Category } from "@/lib/api/categories";

export function CategoriesSection({
  title,
  categories,
  locale,
}: {
  title: string;
  categories: Category[];
  locale: "ka" | "en" | "ru";
}) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h2 className="mb-8 text-2xl font-bold tracking-tight">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/${category.slug}`}
            className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary"
          >
            <span className="text-lg font-semibold transition-colors group-hover:text-primary">
              {category.name[locale]}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
