import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getMyWishlistFromServer } from "@/lib/api/server";
import { WishlistManager } from "@/components/account/WishlistManager";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Deliberately NOT under /account — that whole section hard-redirects
// guests to /login (see account/layout.tsx), but wishlist viewing must
// work for guests too when guest wishlist access is enabled (Settings).
// getMyWishlistFromServer just forwards whatever cookies exist (auth or
// guest) and lets the backend sort out ownership, so this needs no
// special-casing here.
export default async function WishlistPage() {
  const items = await getMyWishlistFromServer();

  return <WishlistPageView items={items} />;
}

function WishlistPageView({ items }: { items: Awaited<ReturnType<typeof getMyWishlistFromServer>> }) {
  const t = useTranslations("Account");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.wishlist")}</h1>
      <p className="mt-2 text-muted-foreground">{t("wishlist.description")}</p>
      <WishlistManager initialItems={items} />
    </div>
  );
}
