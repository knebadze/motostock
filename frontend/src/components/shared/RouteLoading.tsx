import { getTranslations } from "next-intl/server";
import { Loader } from "@/components/shared/Loader";

// Spinner for the loading.tsx files of the private, never-indexed guest
// sections (account, cart, checkout, wishlist, compare). Public catalog
// pages deliberately have none — see NavigationProgress.tsx for why.
export async function RouteLoading() {
  const t = await getTranslations("Common");

  return (
    <div className="flex flex-1 items-center justify-center py-10 sm:py-16 lg:py-24">
      <Loader size="lg" label={t("loader.loading")} className="text-primary-text" />
    </div>
  );
}
