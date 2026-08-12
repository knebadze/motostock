import type { Metadata } from "next";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getMyOrdersFromServer } from "@/lib/api/server";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ReorderButton } from "@/components/shared/ReorderButton";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OrdersPage() {
  const orders = await getMyOrdersFromServer();

  return <OrdersPageView orders={orders} />;
}

function OrdersPageView({ orders }: { orders: Awaited<ReturnType<typeof getMyOrdersFromServer>> }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Account");
  const tOrders = useTranslations("Account.orders");
  const statusLabelKey = locale === "ka" ? "nameKa" : locale === "ru" ? "nameRu" : "nameEn";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.orders")}</h1>

      {orders.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{tOrders("empty")}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <Link href={`/account/orders/${order.id}`} className="flex-1">
                <p className="font-semibold text-foreground">{order.orderCode}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
              </Link>
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                  {order.status[statusLabelKey]}
                </span>
                <span className="font-semibold text-primary">{formatPrice(order.total)}</span>
                <ReorderButton orderId={order.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
