import { getTranslations } from "next-intl/server";
import { Loader } from "@/components/shared/Loader";

// Covers every route under (guest)/ — including (guest)/layout.tsx's own
// header/footer data fetch, since this file sits one level above it (a
// loading.tsx never wraps the layout.tsx colocated in its own folder, only
// nested ones — see node_modules/next/dist/docs/.../loading.md). A more
// specific nested loading.tsx (if one is ever added under a particular
// route) takes over for that subtree instead of this one.
export default async function Loading() {
  const t = await getTranslations("Common");

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Loader size="lg" label={t("loader.loading")} className="text-primary" />
    </div>
  );
}
