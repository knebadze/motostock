import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCompanyInfoFromServer, getMyOrderFromServer } from "@/lib/api/server";
import { localizedLookupName } from "@/lib/api/lookups";
import { formatPrice } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Checkout");
  return { title: t("thankYouTitle"), robots: { index: false, follow: false } };
}

// Where checkout lands after a successful placeOrder: confirmation, the
// order code, what happens next (delivery vs. pickup) and how to reach the
// shop. Only the order's owner can open it (getMyOrderFromServer 404s
// anyone else) — a refresh or revisit just shows it again.
export default async function CheckoutThankYouPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  const [order, companyInfo, t, locale] = await Promise.all([
    getMyOrderFromServer(orderId),
    getCompanyInfoFromServer(),
    getTranslations("Checkout"),
    getLocale(),
  ]);
  if (!order) notFound();

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const isPickup = order.fulfillmentMethod === "PICKUP";
  const shopAddress =
    [companyInfo.city ? localizedLookupName(companyInfo.city, locale as "ka" | "en" | "ru") : null, companyInfo.street]
      .filter(Boolean)
      .join(", ") || null;

  const steps = [
    t("thankYouStepReview"),
    isPickup ? t("thankYouStepPickup") : t("thankYouStepDelivery"),
    t("thankYouStepTrack"),
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-8" aria-hidden>
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t("thankYouTitle")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("thankYouOrderCode")}: <span className="font-semibold text-foreground">#{order.orderCode}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("thankYouEmailNote")}</p>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("thankYouItemCount", { count: itemCount })}</span>
          <span>{t(isPickup ? "pickup" : order.fulfillmentMethod === "CARD" ? "cardPayment" : "courierPayment")}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-lg font-bold text-foreground">
          <span>{t("total")}</span>
          <span className="text-primary-text">{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground">{t("thankYouNextHeading")}</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-text">
                {index + 1}
              </span>
              <span className="pt-0.5 text-foreground">
                {step}
                {index === 1 && !isPickup && order.deliveryTimeSnapshot && (
                  <span className="block text-muted-foreground">
                    {t("thankYouDeliveryTime", { time: order.deliveryTimeSnapshot })}
                  </span>
                )}
                {index === 1 && isPickup && shopAddress && (
                  <span className="block text-muted-foreground">{shopAddress}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
        {companyInfo.phone && (
          <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            {t("thankYouQuestions")}{" "}
            <a href={`tel:${companyInfo.phone}`} className="font-semibold text-primary-text hover:underline">
              {companyInfo.phone}
            </a>
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/account/orders/${order.id}`}
          className="rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          {t("thankYouViewOrder")}
        </Link>
        <Link
          href="/shop"
          className="rounded-full border border-border px-6 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {t("thankYouContinue")}
        </Link>
      </div>
    </div>
  );
}
