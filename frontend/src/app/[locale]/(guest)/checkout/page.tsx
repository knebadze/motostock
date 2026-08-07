import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  getCurrentUserFromServer,
  getLookupItemsFromServer,
  getMyAddressesFromServer,
  getMyCartFromServer,
} from "@/lib/api/server";
import { CheckoutManager } from "@/components/checkout/CheckoutManager";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Not under /account — checkout is a step in the shopping flow, not an
// account-settings page, so it keeps the conventional top-level /checkout
// URL. Unlike /wishlist and /cart, checkout always requires login (no
// guest mode — see orders.routes.ts), so this guards itself the same way
// (guest)/account/layout.tsx does for every account page.
export default async function CheckoutPage() {
  const locale = await getLocale();
  const user = await getCurrentUserFromServer();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [addresses, cart, cities] = await Promise.all([
    getMyAddressesFromServer(),
    getMyCartFromServer(),
    getLookupItemsFromServer("cities"),
  ]);
  if (cart.items.length === 0) {
    redirect({ href: "/cart", locale });
    return null;
  }

  const t = await getTranslations("Checkout");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <CheckoutManager addresses={addresses} cities={cities} />
    </div>
  );
}
