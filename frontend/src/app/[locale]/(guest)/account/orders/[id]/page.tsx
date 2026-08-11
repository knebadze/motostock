import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { getMyOrderFromServer } from "@/lib/api/server";
import { resolveMediaUrl } from "@/lib/api/client";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { OrderFulfillmentMethod } from "@/lib/api/orders";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const FULFILLMENT_KEY: Record<OrderFulfillmentMethod, "cardPayment" | "courierPayment" | "pickup"> = {
  CARD: "cardPayment",
  COURIER: "courierPayment",
  PICKUP: "pickup",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    notFound();
  }

  const order = await getMyOrderFromServer(orderId);
  if (!order) {
    notFound();
  }

  return <OrderDetailPageView order={order} />;
}

function OrderDetailPageView({ order }: { order: NonNullable<Awaited<ReturnType<typeof getMyOrderFromServer>>> }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Checkout");
  const nameLocaleKey = locale === "ka" ? "nameKa" : locale === "ru" ? "nameRu" : "nameEn";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{order.orderCode}</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
          {order.status[nameLocaleKey]}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">{t("fulfillmentHeading")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(FULFILLMENT_KEY[order.fulfillmentMethod])}
            </p>
            {order.bank && (
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t("bankLabel")}:</span>
                <span className="font-medium text-foreground">{order.bank.name[locale]}</span>
              </p>
            )}
            {order.shippingSnapshot && (
              <p className="mt-1 text-sm text-muted-foreground">
                {order.shippingSnapshot.phone} · {order.shippingSnapshot.city[nameLocaleKey]},{" "}
                {order.shippingSnapshot.street}
                {order.shippingSnapshot.building ? `, ${order.shippingSnapshot.building}` : ""}
                {order.shippingSnapshot.apartment ? `, ${order.shippingSnapshot.apartment}` : ""}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">{t("itemsHeading")}</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {order.items.map((item) => {
                const imageUrl = resolveMediaUrl(item.imageUrl);
                return (
                  <li key={item.id} className="flex items-center gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.itemName[locale]}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="size-full border border-dashed border-border" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.itemName[locale]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.quantity} × {formatPrice(item.unitPrice)}
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">{formatPrice(item.lineTotal)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="h-fit rounded-2xl border border-border bg-card p-5">
          {order.promoCode && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{order.promoCode.code}</span>
              <span className="text-muted-foreground">−{order.promoCode.discountPercent}%</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t("subtotal")}</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("discount")}</span>
                <span>−{formatPrice(order.discountTotal)}</span>
              </div>
            )}
            {order.deliveryCost > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>
                  {t("delivery")}
                  {order.deliveryTimeSnapshot ? ` (${order.deliveryTimeSnapshot})` : ""}
                </span>
                <span>{formatPrice(order.deliveryCost)}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between text-lg font-bold text-foreground">
              <span>{t("total")}</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
