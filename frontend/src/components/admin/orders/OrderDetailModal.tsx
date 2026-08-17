"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Loader } from "@/components/shared/Loader";
import { Select } from "@/components/shared/Select";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { formatDateTime, formatPrice } from "@/lib/format";
import {
  getAnyOrder,
  updateOrderStatus,
  type AdminOrder,
  type OrderDeliverySpeed,
  type OrderFulfillmentMethod,
  type OrderRiskFlagType,
} from "@/lib/api/orders";
import { syncOrderStock, type OrderStockSyncItem } from "@/lib/api/fina-sync";
import { listLookupItems, type LookupItem } from "@/lib/api/lookups";

const FULFILLMENT_LABELS: Record<OrderFulfillmentMethod, string> = {
  CARD: "ბარათით გადახდა",
  COURIER: "კურიერთან გადახდა",
  PICKUP: "ადგილიდან გატანა",
};

const RISK_FLAG_LABELS: Record<OrderRiskFlagType, string> = {
  NEW_ACCOUNT_HIGH_VALUE: "ახალი ანგარიში + მაღალი თანხა",
  ORDER_VELOCITY: "შეკვეთების სიხშირე",
  PROMO_CODE_MULTI_ACCOUNT: "პრომოკოდი — მრავალი ანგარიში",
  SHARED_IP_MULTIPLE_ACCOUNTS: "საერთო IP რამდენიმე ანგარიშთან",
};

const DELIVERY_SPEED_LABELS: Record<OrderDeliverySpeed, string> = {
  STANDARD: "სტანდარტული მიტანა",
  EXPRESS: "სწრაფი მიტანა (ექსპრესი)",
};

export function OrderDetailModal({
  orderId,
  statuses,
  onClose,
  onStatusChanged,
}: {
  orderId: number;
  statuses: LookupItem[];
  onClose: () => void;
  onStatusChanged: () => void;
}) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusId, setStatusId] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [syncingStock, setSyncingStock] = useState(false);
  const [stockByVariantId, setStockByVariantId] = useState<Map<number, OrderStockSyncItem>>(new Map());
  const [cancellationReasons, setCancellationReasons] = useState<LookupItem[]>([]);
  const [cancellationReasonId, setCancellationReasonId] = useState("");
  const [cancellationNote, setCancellationNote] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAnyOrder(orderId), listLookupItems("cancellation-reasons")])
      .then(([data, reasons]) => {
        if (!cancelled) {
          setOrder(data);
          setStatusId(String(data.status.id));
          setCancellationReasons(reasons);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof ApiRequestError ? error.message : "შეკვეთის ინფორმაციის ჩატვირთვა ვერ მოხერხდა";
        toast.error(message);
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, onClose]);

  const isCancellingTo =
    statuses.find((status) => String(status.id) === statusId)?.key === "CANCELLED";

  async function handleStatusSave() {
    if (!order || statusId === String(order.status.id)) return;

    if (isCancellingTo && !cancellationReasonId) {
      toast.error("შეკვეთის გაუქმებისას მიზეზის მითითება საჭიროა");
      return;
    }

    setSavingStatus(true);
    try {
      const updated = await updateOrderStatus(
        order.id,
        Number(statusId),
        isCancellingTo ? Number(cancellationReasonId) : undefined,
        isCancellingTo ? cancellationNote.trim() || undefined : undefined,
      );
      setOrder(updated);
      setCancellationReasonId("");
      setCancellationNote("");
      onStatusChanged();
      toast.success("სტატუსი განახლდა და მომხმარებელს ეცნობა იმეილით");
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "სტატუსის განახლება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSyncStock() {
    if (!order) return;

    setSyncingStock(true);
    try {
      const result = await syncOrderStock(order.id);
      setStockByVariantId(new Map(result.items.map((item) => [item.productVariantId, item])));
      if (result.checked === 0) {
        toast.info("ამ შეკვეთაში FINA-სთან დაკავშირებული პროდუქტი არ არის");
      } else {
        toast.success(`შემოწმდა ${result.checked} პროდუქტი, განახლდა ${result.updated}`);
      }
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "მარაგის სინქრონიზაცია ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setSyncingStock(false);
    }
  }

  const statusOptions = statuses.map((status) => ({ value: String(status.id), label: status.nameKa }));
  const cancellationReasonOptions = cancellationReasons.map((reason) => ({
    value: String(reason.id),
    label: reason.nameKa,
  }));

  return (
    <Modal open onClose={onClose} title="შეკვეთის დეტალები" size="2xl">
      {loading || !order ? (
        <div className="flex justify-center py-10">
          <Loader size="lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{order.orderCode}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-44">
                <Select options={statusOptions} value={statusId} onChange={setStatusId} />
              </div>
              <button
                type="button"
                onClick={handleStatusSave}
                disabled={savingStatus || statusId === String(order.status.id)}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingStatus ? "..." : "შენახვა"}
              </button>
            </div>
          </div>

          {isCancellingTo && statusId !== String(order.status.id) && (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">გაუქმების მიზეზი *</label>
                <Select
                  options={cancellationReasonOptions}
                  value={cancellationReasonId}
                  onChange={setCancellationReasonId}
                  placeholder="აირჩიეთ მიზეზი"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">შენიშვნა (არასავალდებულო)</label>
                <textarea
                  value={cancellationNote}
                  onChange={(event) => setCancellationNote(event.target.value)}
                  rows={2}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {order.cancellationReason && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                გაუქმების მიზეზი
              </p>
              <p className="mt-1 text-sm text-foreground">{order.cancellationReason.nameKa}</p>
              {order.cancellationNote && (
                <p className="mt-1 text-sm text-muted-foreground">{order.cancellationNote}</p>
              )}
            </div>
          )}

          {order.riskFlags.length > 0 && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                რისკის სიგნალები
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {order.riskFlags.map((flag, index) => (
                  <li key={index} className="text-sm">
                    <span className="font-medium text-foreground">{RISK_FLAG_LABELS[flag.type]}</span>
                    {flag.detail && <span className="text-muted-foreground"> — {flag.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                მყიდველი
              </p>
              <p className="mt-1 text-sm">
                {order.buyer.firstName} {order.buyer.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{order.buyer.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                მიწოდება
              </p>
              <p className="mt-1 text-sm">{FULFILLMENT_LABELS[order.fulfillmentMethod]}</p>
              {order.deliverySpeed && (
                <p className="text-sm text-muted-foreground">{DELIVERY_SPEED_LABELS[order.deliverySpeed]}</p>
              )}
              {order.bank && (
                <p className="text-sm text-muted-foreground">ბანკი: {order.bank.name.ka}</p>
              )}
              {order.shippingSnapshot && (
                <p className="text-sm text-muted-foreground">
                  {order.shippingSnapshot.phone} · {order.shippingSnapshot.city.nameKa},{" "}
                  {order.shippingSnapshot.street}
                  {order.shippingSnapshot.building ? `, ${order.shippingSnapshot.building}` : ""}
                  {order.shippingSnapshot.apartment ? `, ბინა ${order.shippingSnapshot.apartment}` : ""}
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold">ნივთები</h4>
              <button
                type="button"
                onClick={handleSyncStock}
                disabled={syncingStock}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncingStock ? "შემოწმდება..." : "FINA მარაგის შემოწმება"}
              </button>
            </div>
            <ul className="mt-2 flex flex-col gap-3">
              {order.items.map((item, index) => {
                const imageUrl = resolveMediaUrl(item.imageUrl);
                const stockResult =
                  item.productVariantId != null ? stockByVariantId.get(item.productVariantId) : undefined;
                return (
                  <li key={item.id ?? index} className="flex items-center gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.itemName.ka}
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
                        {item.itemName.ka}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.quantity} × {formatPrice(item.unitPrice)}
                      </span>
                      {stockResult && (
                        <span
                          className={`mt-0.5 text-xs font-medium ${
                            stockResult.newStock === null
                              ? "text-muted-foreground"
                              : stockResult.newStock > 0
                                ? "text-green-600"
                                : "text-red-600"
                          }`}
                        >
                          {stockResult.newStock === null
                            ? "FINA-ში ვერ მოიძებნა"
                            : `FINA მარაგშია: ${stockResult.newStock} ცალი`}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-foreground">{formatPrice(item.lineTotal)}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {order.promoCode && (
            <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{order.promoCode.code}</span>
              <span className="text-muted-foreground">−{order.promoCode.discountPercent}%</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>ჯამი ფასდაკლებამდე</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>ფასდაკლება</span>
                <span>−{formatPrice(order.discountTotal)}</span>
              </div>
            )}
            {order.deliveryCost > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>
                  მიტანის ღირებულება
                  {order.deliveryTimeSnapshot ? ` (${order.deliveryTimeSnapshot})` : ""}
                </span>
                <span>{formatPrice(order.deliveryCost)}</span>
              </div>
            )}
            <div className="mt-1 flex items-center justify-between text-lg font-bold text-foreground">
              <span>სულ</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
