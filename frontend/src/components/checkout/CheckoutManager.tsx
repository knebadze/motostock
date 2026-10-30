"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatPrice } from "@/lib/format";
import { generateUuid } from "@/lib/uuid";
import { getCartItemDisplay } from "@/lib/cart-item-display";
import { EmailVerificationBanner } from "@/components/shared/EmailVerificationBanner";
import {
  placeOrder,
  previewCheckout,
  type CheckoutPreview,
  PAYMENT_METHODS_BY_DELIVERY,
  type OrderDeliveryMethod,
  type OrderDeliverySpeed,
  type OrderPaymentMethod,
} from "@/lib/api/orders";
import type { PublicDeliveryInfo } from "@/lib/api/settings";
import type { Address } from "@/lib/api/addresses";
import type { LookupItem } from "@/lib/api/lookups";
import type { Cart } from "@/lib/api/cart";
import type { GarageVehicle, VehicleSearchOption } from "@/lib/api/vehicle-catalog";
import type { LocalizedString } from "@/lib/api/categories";
import type { PublicBank } from "@/lib/api/banks";
import { AddressFormModal } from "@/components/account/AddressFormModal";
import { MobileActionBar } from "@/components/shared/MobileActionBar";
import { CompatibilityChecker } from "./CompatibilityChecker";

export function CheckoutManager({
  addresses: initialAddresses,
  cities,
  cart,
  vehicleCatalog,
  garageVehicles,
  vehicleFitmentDisabledCategoryIds,
  banks,
  deliveryInfo,
}: {
  addresses: Address[];
  cities: LookupItem[];
  cart: Cart;
  vehicleCatalog: VehicleSearchOption[];
  garageVehicles: GarageVehicle[];
  // Vehicle-independent categories (Category.vehicleFitmentEnabled off) —
  // their products are left out of the compatibility check.
  vehicleFitmentDisabledCategoryIds: number[];
  banks: PublicBank[];
  // Delivery prices (shown on the delivery options) and which delivery /
  // payment methods the admin left switched on. null (couldn't load) —
  // everything is offered and the server still validates.
  deliveryInfo: PublicDeliveryInfo | null;
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Checkout");
  const tErrors = useTranslations("ApiErrors");
  const router = useRouter();
  const cityLabelKey = locale === "ka" ? "nameKa" : locale === "ru" ? "nameRu" : "nameEn";

  // Deduped by product id — a cart can hold several variants of the same
  // product (different size/color), but compatibility is a per-product
  // concept (ProductFitment/ProductFitmentRule), not per-variant.
  const cartProducts = useMemo(() => {
    const byId = new Map<number, { id: number; name: LocalizedString }>();
    for (const item of cart.items) {
      // Vehicle-independent products (e.g. helmets) aren't checked at all.
      if (
        item.itemType === "PRODUCT_VARIANT" &&
        item.productVariant &&
        !vehicleFitmentDisabledCategoryIds.includes(item.productVariant.product.category.id)
      ) {
        byId.set(item.productVariant.product.id, item.productVariant.product);
      }
    }
    return Array.from(byId.values());
  }, [cart, vehicleFitmentDisabledCategoryIds]);

  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  // Only enabled, mutually compatible methods are offered (backend
  // orders.service.ts's assertCheckoutMethods is the authority). Card also
  // needs at least one active bank to pay through.
  const methods = deliveryInfo?.methods ?? { courier: true, pickup: true, card: true, onDelivery: true, inStore: true };
  const isPaymentEnabled = (method: OrderPaymentMethod) =>
    method === "CARD" ? methods.card && banks.length > 0 : method === "ON_DELIVERY" ? methods.onDelivery : methods.inStore;
  const paymentsFor = (delivery: OrderDeliveryMethod) => PAYMENT_METHODS_BY_DELIVERY[delivery].filter(isPaymentEnabled);
  const availableDeliveries = (["COURIER", "PICKUP"] as const).filter(
    (delivery) => (delivery === "COURIER" ? methods.courier : methods.pickup) && paymentsFor(delivery).length > 0,
  );
  const [deliveryMethod, setDeliveryMethod] = useState<OrderDeliveryMethod>(() =>
    availableDeliveries.includes("COURIER") && (addresses.length > 0 || !availableDeliveries.includes("PICKUP"))
      ? "COURIER"
      : (availableDeliveries[0] ?? "PICKUP"),
  );
  // The shopper's pick; when it doesn't fit the chosen delivery method, the
  // first compatible one is used instead (derived, no effect needed).
  const [selectedPayment, setSelectedPayment] = useState<OrderPaymentMethod | null>(null);
  const availablePayments = paymentsFor(deliveryMethod);
  const paymentMethod: OrderPaymentMethod | null =
    selectedPayment && availablePayments.includes(selectedPayment) ? selectedPayment : (availablePayments[0] ?? null);
  const noCheckoutMethods = availableDeliveries.length === 0 || paymentMethod == null;
  const [addressId, setAddressId] = useState<number | null>(addresses[0]?.id ?? null);
  const [bankId, setBankId] = useState<number | null>(banks[0]?.id ?? null);
  const [selectedDeliverySpeed, setDeliverySpeed] = useState<OrderDeliverySpeed>("STANDARD");
  // Express exists only when the admin configured it (a price or a time —
  // same rule as the product page's delivery block); otherwise standard.
  const expressAvailable =
    deliveryInfo == null || deliveryInfo.express.price > 0 || deliveryInfo.express.time.trim() !== "";
  const deliverySpeed: OrderDeliverySpeed = expressAvailable ? selectedDeliverySpeed : "STANDARD";
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [promoApplying, setPromoApplying] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  // Generated once for this checkout session and reused unchanged across
  // every preview/place call, including retries — see orders.ts's
  // CheckoutInput.idempotencyKey and orders.service.ts's placeOrder, which
  // uses it to recognize a double-click or timeout-retry and return the
  // original order instead of creating a second one. Regenerated on
  // IDEMPOTENCY_KEY_CART_CHANGED (see handlePlaceOrder's catch below) —
  // that error means the backend already placed an order under this key and
  // is refusing to silently attach it to a cart that's since changed, so a
  // real *new* attempt needs a key of its own.
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateUuid());
  // The summary's own "place order" button — on phones the sticky bar shows
  // once it's off screen (it sits at the very end of the single column).
  const placeOrderButtonRef = useRef<HTMLButtonElement>(null);

  const priceLabel = (price: number) => (price > 0 ? formatPrice(price) : t("free"));
  const requiresAddress = deliveryMethod === "COURIER";
  const requiresBank = paymentMethod === "CARD";
  const canFetchPreview =
    !noCheckoutMethods && (!requiresAddress || addressId != null) && (!requiresBank || bankId != null);
  // Derived rather than reset via setState in the effect below (nothing to
  // preview yet when a courier method has no address picked) — avoids a
  // synchronous setState-in-effect that could instead just be computed here.
  const displayPreview = canFetchPreview ? preview : null;

  // The items list used to render only from the preview, which doesn't
  // exist until a courier method has an address (and a card method a bank)
  // picked — so "Order items" sat empty right when the shopper was deciding.
  // Falls back to the cart's own lines (no stock check yet; the preview adds
  // that once it can be fetched).
  const summaryItems = displayPreview
    ? displayPreview.items.map((item, index) => ({
        key: item.id ?? `preview-${index}`,
        imageUrl: resolveMediaUrl(item.imageUrl),
        title: item.itemName[locale],
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        stockIssue: item.inStock ? null : item.availableQuantity,
      }))
    : cart.items.map((item) => {
        const display = getCartItemDisplay(item, locale);
        return {
          key: item.id,
          imageUrl: display.imageUrl,
          title: display.title,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          stockIssue: null as number | null,
        };
      });

  useEffect(() => {
    if (!canFetchPreview) return;

    let cancelled = false;
    // Deferred via setTimeout (same idiom ProductShopPage's filter-refetch
    // effect uses) so the loading-state setState isn't called synchronously
    // in the effect body itself.
    const timeoutId = setTimeout(() => {
      setPreviewLoading(true);
      previewCheckout({
        deliveryMethod,
        paymentMethod: paymentMethod!,
        addressId: requiresAddress ? (addressId ?? undefined) : undefined,
        deliverySpeed: requiresAddress ? deliverySpeed : undefined,
        promoCode: appliedPromoCode ?? undefined,
        bankId: requiresBank ? (bankId ?? undefined) : undefined,
        idempotencyKey,
      })
        .then((result) => {
          if (!cancelled) setPreview(result);
        })
        .catch((error) => {
          if (!cancelled) {
            if (error instanceof ApiRequestError && error.status === 403) {
              setEmailVerificationRequired(true);
            } else {
              toast.error(resolveApiErrorMessage(error, tErrors, t("previewError")));
            }
            setPreview(null);
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    deliveryMethod,
    paymentMethod,
    addressId,
    bankId,
    deliverySpeed,
    appliedPromoCode,
    canFetchPreview,
    requiresAddress,
    requiresBank,
  ]);

  async function handleApplyPromoCode() {
    const code = promoCodeInput.trim();
    if (!code) return;

    setPromoApplying(true);
    try {
      const result = await previewCheckout({
        deliveryMethod,
        paymentMethod: paymentMethod!,
        addressId: requiresAddress ? (addressId ?? undefined) : undefined,
        deliverySpeed: requiresAddress ? deliverySpeed : undefined,
        promoCode: code,
        bankId: requiresBank ? (bankId ?? undefined) : undefined,
        idempotencyKey,
      });
      setPreview(result);
      setAppliedPromoCode(code);
      toast.success(t("promoApplied"));
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("promoError")));
    } finally {
      setPromoApplying(false);
    }
  }

  function handleRemovePromoCode() {
    setAppliedPromoCode(null);
    setPromoCodeInput("");
  }

  function handleAddressSaved(saved: Address) {
    setAddresses((current) => [saved, ...current]);
    setAddressId(saved.id);
  }

  async function handlePlaceOrder() {
    if (noCheckoutMethods) return;
    if (requiresAddress && addressId == null) {
      toast.error(t("addressRequired"));
      return;
    }
    if (requiresBank && bankId == null) {
      toast.error(t("bankRequired"));
      return;
    }

    setPlacing(true);
    try {
      const order = await placeOrder({
        deliveryMethod,
        paymentMethod: paymentMethod!,
        addressId: requiresAddress ? (addressId ?? undefined) : undefined,
        deliverySpeed: requiresAddress ? deliverySpeed : undefined,
        promoCode: appliedPromoCode ?? undefined,
        bankId: requiresBank ? (bankId ?? undefined) : undefined,
        idempotencyKey,
      });
      toast.success(t("placeSuccess"));
      // router.refresh() clears the client cache for whatever route is
      // "current" at the moment it's called (see Next's own docs) — calling
      // it *before* push() targeted /checkout, which we're leaving right
      // afterward, not the destination. The shared (guest) layout's cached
      // cart badge (fetched there, server-side) then carried over stale
      // into /account/orders/:id, only correcting itself once something
      // else (e.g. opening the cart dropdown) forced a live fetch. Navigate
      // first, then refresh — now "current route" is the order page, so its
      // shared layout actually refetches.
      router.push(`/checkout/thank-you/${order.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 403) {
        setEmailVerificationRequired(true);
      } else if (error instanceof ApiRequestError && error.code === "IDEMPOTENCY_KEY_CART_CHANGED") {
        // The backend already placed an order under the old key and is
        // refusing to silently attach it to what's now a different cart —
        // mint a fresh key so the next click is a genuine new attempt, and
        // refresh so the displayed cart/preview reflect what's actually in
        // it now.
        setIdempotencyKey(generateUuid());
        toast.error(resolveApiErrorMessage(error, tErrors, t("placeError")));
        router.refresh();
      } else {
        toast.error(resolveApiErrorMessage(error, tErrors, t("placeError")));
      }
    } finally {
      setPlacing(false);
    }
  }

  return (
    <>
      {emailVerificationRequired && (
        <div className="mt-6">
          <EmailVerificationBanner message={t("emailVerificationRequired")} />
        </div>
      )}

    <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">{t("deliveryMethodHeading")}</h2>
          {noCheckoutMethods ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("noCheckoutMethods")}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {availableDeliveries.map((delivery) => (
                <label
                  key={delivery}
                  className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm has-[:checked]:border-primary"
                >
                  <input
                    type="radio"
                    name="deliveryMethod"
                    className="mt-1"
                    checked={deliveryMethod === delivery}
                    onChange={() => setDeliveryMethod(delivery)}
                  />
                  <span>
                    <span className="block font-medium text-foreground">
                      {t(delivery === "COURIER" ? "deliveryCourier" : "deliveryPickup")}
                    </span>
                    <span className="block text-muted-foreground">
                      {delivery === "COURIER"
                        ? deliveryInfo
                          ? t("deliveryCourierHint", {
                              tbilisi: priceLabel(deliveryInfo.tbilisi.price),
                              regions: priceLabel(deliveryInfo.regions.price),
                            })
                          : t("deliveryCourierHintPlain")
                        : t("deliveryPickupHint")}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        {!noCheckoutMethods && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">{t("paymentMethodHeading")}</h2>
            <div className="mt-3 flex flex-col gap-2">
              {availablePayments.map((payment) => (
                <label
                  key={payment}
                  className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm has-[:checked]:border-primary"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="mt-1"
                    checked={paymentMethod === payment}
                    onChange={() => setSelectedPayment(payment)}
                  />
                  <span>
                    <span className="block font-medium text-foreground">
                      {t(
                        payment === "CARD"
                          ? "paymentCard"
                          : payment === "ON_DELIVERY"
                            ? "paymentOnDelivery"
                            : "paymentInStore",
                      )}
                    </span>
                    <span className="block text-muted-foreground">
                      {t(
                        payment === "CARD"
                          ? "paymentCardHint"
                          : payment === "ON_DELIVERY"
                            ? "paymentOnDeliveryHint"
                            : "paymentInStoreHint",
                      )}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        {requiresBank && (
          <section
            className={`rounded-2xl border bg-card p-5 ${
              bankId == null ? "border-red-300" : "border-border"
            }`}
          >
            <h2 className="font-semibold text-foreground">
              {banks.length > 1 ? t("bankHeading") : t("bankLabel")}
            </h2>
            {banks.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("noBanks")}</p>
            ) : banks.length === 1 ? (
              // Nothing to actually choose — shown as a plain confirmation,
              // not a picker, since presenting a single-option "choice" reads
              // oddly. bankId already defaults to this bank's id on mount.
              <div className="mt-3 flex items-center gap-3">
                {resolveMediaUrl(banks[0].logoUrl) ? (
                  <Image
                    src={resolveMediaUrl(banks[0].logoUrl)!}
                    alt={banks[0].name[locale]}
                    width={80}
                    height={40}
                    className="h-8 w-auto object-contain"
                  />
                ) : null}
                <span className="text-sm font-medium text-foreground">{banks[0].name[locale]}</span>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {banks.map((bank) => {
                  const logoUrl = resolveMediaUrl(bank.logoUrl);
                  return (
                    <label
                      key={bank.id}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border p-3 text-center text-xs has-[:checked]:border-primary"
                    >
                      <input
                        type="radio"
                        name="bankId"
                        className="sr-only"
                        checked={bankId === bank.id}
                        onChange={() => setBankId(bank.id)}
                      />
                      <div className="flex h-10 w-full items-center justify-center">
                        {logoUrl ? (
                          <Image
                            src={logoUrl}
                            alt={bank.name[locale]}
                            width={80}
                            height={40}
                            className="h-full w-auto object-contain"
                          />
                        ) : (
                          <span className="font-semibold text-foreground">{bank.name[locale]}</span>
                        )}
                      </div>
                      {logoUrl && <span className="font-medium text-foreground">{bank.name[locale]}</span>}
                    </label>
                  );
                })}
              </div>
            )}
            {/* Same ambient-inline reasoning as the address section above —
                in practice bankId only ends up null when banks.length is 0
                (already covered by the "noBanks" message), but this keeps
                the two required-field sections consistent and covers any
                future bank-selection path that doesn't auto-default it. */}
            {requiresBank && bankId == null && (
              <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                {t("bankRequired")}
              </p>
            )}
          </section>
        )}

        {requiresAddress && (
          <section
            className={`rounded-2xl border bg-card p-5 ${
              addressId == null ? "border-red-300" : "border-border"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-foreground">{t("addressHeading")}</h2>
              <button
                type="button"
                onClick={() => setAddressModalOpen(true)}
                className="text-sm font-medium text-primary-text hover:underline"
              >
                {t("addAddressButton")}
              </button>
            </div>

            {addresses.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("noAddresses")}</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm has-[:checked]:border-primary"
                  >
                    <input
                      type="radio"
                      name="addressId"
                      aria-invalid={addressId == null || undefined}
                      aria-describedby={addressId == null ? "checkout-address-error" : undefined}
                      className="mt-1"
                      checked={addressId === address.id}
                      onChange={() => setAddressId(address.id)}
                    />
                    <span>
                      <span className="block font-medium text-foreground">{address.phone}</span>
                      <span className="block text-muted-foreground">
                        {address.city[cityLabelKey]}, {address.street}
                        {address.building ? `, ${address.building}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {/* Ambient, not just on failed submit — shows the moment this
                section is incomplete (e.g. switching to a delivery method
                with no saved address yet), so the disabled Place Order
                button below always has a nearby explanation instead of
                only the toast handlePlaceOrder falls back to. */}
            {requiresAddress && addressId == null && (
              <p id="checkout-address-error" role="alert" className="mt-2 text-sm font-medium text-destructive">
                {t("addressRequired")}
              </p>
            )}
          </section>
        )}

        {/* Only a real choice when express is set up — otherwise there's
            nothing to pick (standard is applied). */}
        {requiresAddress && expressAvailable && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">{t("deliverySpeedHeading")}</h2>
            <div className="mt-3 flex flex-col gap-2">
              {(["STANDARD", "EXPRESS"] as const).map((speed) => {
                const selectedAddress = addresses.find((address) => address.id === addressId);
                const option =
                  deliveryInfo == null
                    ? null
                    : speed === "EXPRESS"
                      ? deliveryInfo.express
                      : selectedAddress
                        ? selectedAddress.city.isTbilisi
                          ? deliveryInfo.tbilisi
                          : deliveryInfo.regions
                        : null;
                return (
                  <label
                    key={speed}
                    className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm has-[:checked]:border-primary"
                  >
                    <input
                      type="radio"
                      name="deliverySpeed"
                      className="mt-1"
                      checked={deliverySpeed === speed}
                      onChange={() => setDeliverySpeed(speed)}
                    />
                    <span>
                      <span className="block font-medium text-foreground">
                        {t(speed === "EXPRESS" ? "deliveryExpress" : "deliveryStandard")}
                      </span>
                      {option && (
                        <span className="block text-muted-foreground">
                          {priceLabel(option.price)}
                          {option.time.trim() ? ` · ${option.time.trim()}` : ""}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">{t("itemsHeading")}</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {summaryItems.map((item) => {
              const imageUrl = item.imageUrl;
              return (
                <li key={item.key} className="flex items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={item.title}
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
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.quantity} × {formatPrice(item.unitPrice)}
                    </span>
                    {item.stockIssue != null && (
                      <span className="mt-1 text-xs font-medium text-destructive">
                        {item.stockIssue > 0
                          ? t("limitedStockItem", { count: item.stockIssue })
                          : t("outOfStockItem")}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-foreground">{formatPrice(item.lineTotal)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <CompatibilityChecker
          vehicleCatalog={vehicleCatalog}
          garageVehicles={garageVehicles}
          products={cartProducts}
        />
      </div>

      <div className="flex h-fit flex-col gap-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">{t("promoHeading")}</h2>
          {appliedPromoCode ? (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{appliedPromoCode}</span>
              <button
                type="button"
                onClick={handleRemovePromoCode}
                className="text-muted-foreground hover:text-destructive"
              >
                {t("removePromo")}
              </button>
            </div>
          ) : (
            <div className="mt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCodeInput}
                  onChange={(event) => setPromoCodeInput(event.target.value)}
                  placeholder={t("promoPlaceholder")}
                  disabled={displayPreview?.promoCodeBlocked ?? false}
                  className="min-w-0 flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleApplyPromoCode}
                  disabled={promoApplying || !promoCodeInput.trim() || (displayPreview?.promoCodeBlocked ?? false)}
                  className="rounded-full border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary-text disabled:opacity-50"
                >
                  {t("applyPromo")}
                </button>
              </div>
              {displayPreview?.promoCodeBlocked && (
                <p className="mt-2 text-xs text-muted-foreground">{t("promoBlockedMessage")}</p>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-1.5 text-sm">
            {/* Totals come only from the server preview, which can't be
                fetched until a courier method has an address (and a card
                method a bank) — this used to render "0.00 ₾" as the total in
                the meantime. Until then: the cart's own items total, plus
                what's still missing for the full amount. */}
            {displayPreview ? (
              <>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t("subtotal")}</span>
                  <span>{formatPrice(displayPreview.subtotal)}</span>
                </div>
                {displayPreview.discountTotal > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{t("discount")}</span>
                    <span>−{formatPrice(displayPreview.discountTotal)}</span>
                  </div>
                )}
                {displayPreview.deliveryCost > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      {t("delivery")}
                      {displayPreview.deliveryTimeSnapshot ? ` (${displayPreview.deliveryTimeSnapshot})` : ""}
                    </span>
                    <span>{formatPrice(displayPreview.deliveryCost)}</span>
                  </div>
                )}
                <div className="mt-1 flex items-center justify-between text-lg font-bold text-foreground">
                  <span>{t("total")}</span>
                  <span className="text-primary-text">{formatPrice(displayPreview.total)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>{t("itemsTotal")}</span>
                  <span>{formatPrice(cart.subtotal)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {!canFetchPreview
                    ? requiresAddress && addressId == null
                      ? t("totalNeedsAddress")
                      : t("totalNeedsBank")
                    : previewLoading
                      ? t("totalCalculating")
                      : null}
                </p>
              </>
            )}
          </div>

          {displayPreview?.hasStockIssues && (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {t("stockIssueMessage")}
            </p>
          )}

          <button
            ref={placeOrderButtonRef}
            type="button"
            onClick={handlePlaceOrder}
            disabled={
              noCheckoutMethods || placing || previewLoading || !displayPreview || displayPreview.hasStockIssues
            }
            className="mt-5 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {placing ? t("placing") : t("placeOrder")}
          </button>
        </section>
      </div>

      <MobileActionBar targetRef={placeOrderButtonRef}>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{displayPreview ? t("total") : t("itemsTotal")}</p>
          <p className="text-base font-bold text-primary-text">
            {formatPrice(displayPreview ? displayPreview.total : cart.subtotal)}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={
            noCheckoutMethods || placing || previewLoading || !displayPreview || displayPreview.hasStockIssues
          }
          className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {placing ? t("placing") : t("placeOrder")}
        </button>
      </MobileActionBar>

      <AddressFormModal
        key={String(addressModalOpen)}
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSaved={handleAddressSaved}
        initialAddress={null}
        cities={cities}
      />
    </div>
    </>
  );
}
