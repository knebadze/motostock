import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { getCompanyInfoFromServer, getDeliveryInfoFromServer, getMyOrderFromServer } from "@/lib/api/server";
import { resolveMediaUrl } from "@/lib/api/client";
import { formatDateTime, formatPrice } from "@/lib/format";
import {
  getOrderInvoiceUrl,
  type OrderDeliveryMethod,
  type OrderPaymentMethod,
  type PaymentStatus,
} from "@/lib/api/orders";
import { ReorderButton } from "@/components/shared/ReorderButton";
import { OrderRequestPanel } from "@/components/account/OrderRequestPanel";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = noindexMetadata({ follow: false });

const DELIVERY_METHOD_KEY: Record<OrderDeliveryMethod, "deliveryCourier" | "deliveryPickup"> = {
  COURIER: "deliveryCourier",
  PICKUP: "deliveryPickup",
};

const PAYMENT_METHOD_KEY: Record<OrderPaymentMethod, "paymentCard" | "paymentOnDelivery" | "paymentInStore"> = {
  CARD: "paymentCard",
  ON_DELIVERY: "paymentOnDelivery",
  IN_STORE: "paymentInStore",
};

// NOT_APPLICABLE has no key — it's rendered as nothing (see below), same as
// the admin PaymentStatusBadge convention.
const PAYMENT_STATUS_KEY: Partial<
  Record<PaymentStatus, "paymentStatusAwaitingPayment" | "paymentStatusPaid" | "paymentStatusFailed" | "paymentStatusRefunded">
> = {
  AWAITING_PAYMENT: "paymentStatusAwaitingPayment",
  PAID: "paymentStatusPaid",
  FAILED: "paymentStatusFailed",
  REFUNDED: "paymentStatusRefunded",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    notFound();
  }

  const [order, companyInfo, deliveryInfo] = await Promise.all([
    getMyOrderFromServer(orderId),
    getCompanyInfoFromServer(),
    getDeliveryInfoFromServer(),
  ]);
  if (!order) {
    notFound();
  }

  const returnPeriodDays = deliveryInfo?.returnPeriodDays ?? 0;
  return (
    <OrderDetailPageView
      order={order}
      shopPhone={companyInfo.phone}
      returnPeriodDays={returnPeriodDays}
      returnWindowOpen={isReturnWindowOpen(order, returnPeriodDays)}
    />
  );
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type MyOrder = NonNullable<Awaited<ReturnType<typeof getMyOrderFromServer>>>;

// Mirrors the backend check (order-requests.service.ts): counted from when
// the order reached DELIVERED; no window configured (0) means always open.
function isReturnWindowOpen(order: MyOrder, returnPeriodDays: number): boolean {
  if (returnPeriodDays === 0) return true;
  const delivered = [...order.statusHistory].reverse().find((entry) => entry.status.key === "DELIVERED");
  if (!delivered) return false;
  return Date.now() - new Date(delivered.createdAt).getTime() <= returnPeriodDays * MS_PER_DAY;
}

function OrderDetailPageView({
  order,
  shopPhone,
  returnPeriodDays,
  returnWindowOpen,
}: {
  order: MyOrder;
  shopPhone: string | null;
  returnPeriodDays: number;
  returnWindowOpen: boolean;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Checkout");
  const tOrders = useTranslations("Account.orders");
  const nameLocaleKey = locale === "ka" ? "nameKa" : locale === "ru" ? "nameRu" : "nameEn";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{order.orderCode}</h1>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
            {order.status[nameLocaleKey]}
          </span>
          <a
            href={getOrderInvoiceUrl(order.id, locale)}
            target="_blank"
            rel="noopener"
            className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {tOrders("invoiceDownload")}
          </a>
          <ReorderButton orderId={order.id} />
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">{t("fulfillmentHeading")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(DELIVERY_METHOD_KEY[order.deliveryMethod])} · {t(PAYMENT_METHOD_KEY[order.paymentMethod])}
            </p>
            {order.bank && (
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t("bankLabel")}:</span>
                <span className="font-medium text-foreground">{order.bank.name[locale]}</span>
              </p>
            )}
            {PAYMENT_STATUS_KEY[order.paymentStatus] && (
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t("paymentStatusLabel")}:</span>
                <span className="font-medium text-foreground">
                  {t(PAYMENT_STATUS_KEY[order.paymentStatus]!)}
                </span>
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

          {order.statusHistory.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground">{tOrders("historyHeading")}</h2>
              <ol className="mt-4 flex flex-col">
                {order.statusHistory.map((entry, index) => {
                  const isLatest = index === order.statusHistory.length - 1;
                  return (
                    <li key={index} className="relative flex gap-3 pb-4 last:pb-0">
                      {!isLatest && (
                        <span className="absolute left-[5px] top-4 h-[calc(100%-0.5rem)] w-px bg-border" aria-hidden />
                      )}
                      <span
                        className={`mt-1.5 size-[11px] shrink-0 rounded-full ${
                          isLatest ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/40"
                        }`}
                        aria-hidden
                      />
                      <div className="flex flex-col">
                        <span className={`text-sm ${isLatest ? "font-semibold text-foreground" : "text-foreground"}`}>
                          {entry.status[nameLocaleKey]}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <OrderRequestPanel
            orderId={order.id}
            statusKey={order.status.key}
            returnWindowOpen={returnWindowOpen}
            returnPeriodDays={returnPeriodDays}
            initialRequests={order.requests}
            shopPhone={shopPhone}
          />

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
              <span className="text-primary-text">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
