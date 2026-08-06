import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getMyCartFromServer } from "@/lib/api/server";
import { CartManager } from "@/components/account/CartManager";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Not under /account — same reasoning as /wishlist: that section
// hard-redirects guests to /login, but cart must work for guests too when
// guest cart access is enabled (Settings). getMyCartFromServer just
// forwards whatever cookies exist and lets the backend sort out ownership.
export default async function CartPage() {
  const cart = await getMyCartFromServer();

  return <CartPageView cart={cart} />;
}

function CartPageView({ cart }: { cart: Awaited<ReturnType<typeof getMyCartFromServer>> }) {
  const tHeader = useTranslations("Header");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight">{tHeader("cart")}</h1>
      <CartManager initialCart={cart} />
    </div>
  );
}
