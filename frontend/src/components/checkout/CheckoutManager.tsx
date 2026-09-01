"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { formatPrice } from "@/lib/format";
import { EmailVerificationBanner } from "@/components/shared/EmailVerificationBanner";
import {
  placeOrder,
  previewCheckout,
  type CheckoutPreview,
  type OrderDeliverySpeed,
  type OrderFulfillmentMethod,
} from "@/lib/api/orders";
import type { Address } from "@/lib/api/addresses";
import type { LookupItem } from "@/lib/api/lookups";
import type { Cart } from "@/lib/api/cart";
import type { GarageVehicle, VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import type { LocalizedString } from "@/lib/api/categories";
import type { PublicBank } from "@/lib/api/banks";
import { AddressFormModal } from "@/components/account/AddressFormModal";
import { CompatibilityChecker } from "./CompatibilityChecker";

export function CheckoutManager({
  addresses: initialAddresses,
  cities,
  cart,
  vehicleCatalog,
  garageVehicles,
  banks,
}: {
  addresses: Address[];
  cities: LookupItem[];
  cart: Cart;
  vehicleCatalog: VehicleCatalogEntry[];
  garageVehicles: GarageVehicle[];
  banks: PublicBank[];
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
      if (item.itemType === "PRODUCT_VARIANT" && item.productVariant) {
        byId.set(item.productVariant.product.id, item.productVariant.product);
      }
    }
    return Array.from(byId.values());
  }, [cart]);

  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<OrderFulfillmentMethod>(
    addresses.length > 0 ? "CARD" : "PICKUP",
  );
  const [addressId, setAddressId] = useState<number | null>(addresses[0]?.id ?? null);
  const [bankId, setBankId] = useState<number | null>(banks[0]?.id ?? null);
  const [deliverySpeed, setDeliverySpeed] = useState<OrderDeliverySpeed>("STANDARD");
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
  // original order instead of creating a second one.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const requiresAddress = fulfillmentMethod !== "PICKUP";
  const requiresBank = fulfillmentMethod === "CARD";
  const canFetchPreview = (!requiresAddress || addressId != null) && (!requiresBank || bankId != null);
  // Derived rather than reset via setState in the effect below (nothing to
  // preview yet when a courier method has no address picked) — avoids a
  // synchronous setState-in-effect that could instead just be computed here.
  const displayPreview = canFetchPreview ? preview : null;

  useEffect(() => {
    if (!canFetchPreview) return;

    let cancelled = false;
    // Deferred via setTimeout (same idiom ProductShopPage's filter-refetch
    // effect uses) so the loading-state setState isn't called synchronously
    // in the effect body itself.
    const timeoutId = setTimeout(() => {
      setPreviewLoading(true);
      previewCheckout({
        fulfillmentMethod,
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
    fulfillmentMethod,
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
        fulfillmentMethod,
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
        fulfillmentMethod,
        addressId: requiresAddress ? (addressId ?? undefined) : undefined,
        deliverySpeed: requiresAddress ? deliverySpeed : undefined,
        promoCode: appliedPromoCode ?? undefined,
        bankId: requiresBank ? (bankId ?? undefined) : undefined,
        idempotencyKey,
      });
      toast.success(t("placeSuccess"));
      // Clears the router cache for the shared (guest) layout so the
      // Header's cart badge (fetched there, server-side) reflects the
      // now-emptied cart instead of staying stale after navigating to a
      // sibling route — same fix AddToCartButton already applies for
      // quantity changes.
      router.refresh();
      router.push(`/account/orders/${order.id}`);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 403) {
        setEmailVerificationRequired(true);
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
                className="text-sm font-medium text-primary hover:underline"
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
              <p className="mt-2 text-sm font-medium text-red-600">{t("addressRequired")}</p>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">{t("itemsHeading")}</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {(displayPreview?.items ?? []).map((item, index) => {
              const imageUrl = resolveMediaUrl(item.imageUrl);
              return (
                <li key={item.id ?? index} className="flex items-center gap-3">
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
                    {!item.inStock && (
                      <span className="mt-1 text-xs font-medium text-red-600">
                        {item.availableQuantity > 0
                          ? t("limitedStockItem", { count: item.availableQuantity })
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
          <h2 className="font-semibold text-foreground">{t("fulfillmentHeading")}</h2>
          <div className="mt-3 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="fulfillmentMethod"
                checked={fulfillmentMethod === "CARD"}
                onChange={() => setFulfillmentMethod("CARD")}
              />
              {t("cardPayment")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="fulfillmentMethod"
                checked={fulfillmentMethod === "COURIER"}
                onChange={() => setFulfillmentMethod("COURIER")}
              />
              {t("courierPayment")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="fulfillmentMethod"
                checked={fulfillmentMethod === "PICKUP"}
                onChange={() => setFulfillmentMethod("PICKUP")}
              />
              {t("pickup")}
            </label>
          </div>
        </section>

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
              <p className="mt-2 text-sm font-medium text-red-600">{t("bankRequired")}</p>
            )}
          </section>
        )}

        {requiresAddress && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">{t("deliverySpeedHeading")}</h2>
            <div className="mt-3 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="deliverySpeed"
                  checked={deliverySpeed === "STANDARD"}
                  onChange={() => setDeliverySpeed("STANDARD")}
                />
                {t("deliveryStandard")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="deliverySpeed"
                  checked={deliverySpeed === "EXPRESS"}
                  onChange={() => setDeliverySpeed("EXPRESS")}
                />
                {t("deliveryExpress")}
              </label>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">{t("promoHeading")}</h2>
          {appliedPromoCode ? (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{appliedPromoCode}</span>
              <button
                type="button"
                onClick={handleRemovePromoCode}
                className="text-muted-foreground hover:text-red-600"
              >
                {t("removePromo")}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={promoCodeInput}
                onChange={(event) => setPromoCodeInput(event.target.value)}
                placeholder={t("promoPlaceholder")}
                className="min-w-0 flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleApplyPromoCode}
                disabled={promoApplying || !promoCodeInput.trim()}
                className="rounded-full border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {t("applyPromo")}
              </button>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t("subtotal")}</span>
              <span>{formatPrice(displayPreview?.subtotal ?? 0)}</span>
            </div>
            {displayPreview && displayPreview.discountTotal > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("discount")}</span>
                <span>−{formatPrice(displayPreview.discountTotal)}</span>
              </div>
            )}
            {displayPreview && displayPreview.deliveryCost > 0 && (
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
              <span className="text-primary">{formatPrice(displayPreview?.total ?? 0)}</span>
            </div>
          </div>

          {displayPreview?.hasStockIssues && (
            <p className="mt-3 text-sm font-medium text-red-600">{t("stockIssueMessage")}</p>
          )}

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={
              placing || previewLoading || !displayPreview || displayPreview.hasStockIssues
            }
            className="mt-5 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {placing ? t("placing") : t("placeOrder")}
          </button>
        </section>
      </div>

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
