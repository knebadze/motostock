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
} from "@/lib/api/orders";
import type { LookupItem } from "@/lib/api/lookups";

const FULFILLMENT_LABELS: Record<OrderFulfillmentMethod, string> = {
  CARD: "ბარათით გადახდა",
  COURIER: "კურიერთან გადახდა",
  PICKUP: "ადგილიდან გატანა",
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

  useEffect(() => {
    let cancelled = false;

    getAnyOrder(orderId)
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
          setStatusId(String(data.status.id));
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

  async function handleStatusSave() {
    if (!order || statusId === String(order.status.id)) return;

    setSavingStatus(true);
    try {
      const updated = await updateOrderStatus(order.id, Number(statusId));
      setOrder(updated);
      onStatusChanged();
      toast.success("სტატუსი განახლდა და მომხმარებელს ეცნობა იმეილით");
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "სტატუსის განახლება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setSavingStatus(false);
    }
  }

  const statusOptions = statuses.map((status) => ({ value: String(status.id), label: status.nameKa }));

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
            <h4 className="text-sm font-semibold">ნივთები</h4>
            <ul className="mt-2 flex flex-col gap-3">
              {order.items.map((item, index) => {
                const imageUrl = resolveMediaUrl(item.imageUrl);
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
