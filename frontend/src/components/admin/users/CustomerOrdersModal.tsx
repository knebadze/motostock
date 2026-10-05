"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Loader } from "@/components/shared/Loader";
import { ApiRequestError } from "@/lib/api/client";
import { listAllOrders, type AdminOrdersPage } from "@/lib/api/orders";
import { listOrderStatuses, type OrderStatusItem } from "@/lib/api/order-statuses";
import { OrdersManager } from "@/components/admin/orders/OrdersManager";

const PAGE_SIZE = 20;

// One customer's full order history — the same list/filters/pagination/
// detail as the admin Orders page (OrdersManager in scoped mode), in a wide
// modal opened from the user-detail modal. Order details open on top of it
// (Modal supports nesting).
export function CustomerOrdersModal({
  userId,
  userName,
  onClose,
}: {
  userId: number;
  userName: string;
  onClose: () => void;
}) {
  const [initial, setInitial] = useState<{ page: AdminOrdersPage; statuses: OrderStatusItem[] } | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listAllOrders({ userId, page: 1, pageSize: PAGE_SIZE }), listOrderStatuses()])
      .then(([page, statuses]) => {
        if (!cancelled) setInitial({ page, statuses });
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error instanceof ApiRequestError ? error.message : "შეკვეთების ჩატვირთვა ვერ მოხერხდა");
        onClose();
      });

    return () => {
      cancelled = true;
    };
  }, [userId, onClose]);

  return (
    <Modal open onClose={onClose} title={`შეკვეთების ისტორია — ${userName}`} size="3xl">
      {!initial ? (
        <div className="flex justify-center py-10">
          <Loader size="lg" />
        </div>
      ) : (
        <OrdersManager
          initialData={initial.page}
          statuses={initial.statuses}
          initialFilters={{ userId }}
          scopeUserId={userId}
        />
      )}
    </Modal>
  );
}
