"use client";

import { useState } from "react";
import type { AdminOrderRequest } from "@/lib/api/orders";
import type { CallbackRequest } from "@/lib/api/callback-requests";
import { OrderRequestsManager } from "./OrderRequestsManager";
import { CallbackRequestsPanel } from "./CallbackRequestsPanel";

type Section = "orders" | "callbacks";

// /admin/order-requests: everything customers asked the shop for — order
// cancel/return requests and "call me back" requests — one inbox, one
// header badge (AdminOrderRequestNotifications sums both).
export function RequestsInbox({
  initialOrderRequests,
  initialCallbackRequests,
  cancelledStatusId,
}: {
  initialOrderRequests: AdminOrderRequest[];
  initialCallbackRequests: CallbackRequest[];
  cancelledStatusId: number | null;
}) {
  // Open the section that has something waiting.
  const [section, setSection] = useState<Section>(
    initialOrderRequests.length === 0 && initialCallbackRequests.length > 0 ? "callbacks" : "orders",
  );
  const [orderCount, setOrderCount] = useState(initialOrderRequests.length);
  const [callbackCount, setCallbackCount] = useState(initialCallbackRequests.length);

  const tabs: { value: Section; label: string; count: number }[] = [
    { value: "orders", label: "შეკვეთის გაუქმება/დაბრუნება", count: orderCount },
    { value: "callbacks", label: "დარეკვის თხოვნები", count: callbackCount },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">მომხმარებლის მოთხოვნები</h1>
      <div className="mt-4 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSection(tab.value)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              section === tab.value
                ? "border-primary text-primary-text"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {/* Both stay mounted (hidden) so switching keeps each one's state. */}
        <div hidden={section !== "orders"}>
          <OrderRequestsManager
            initialOpen={initialOrderRequests}
            cancelledStatusId={cancelledStatusId}
            onOpenCountChange={setOrderCount}
          />
        </div>
        <div hidden={section !== "callbacks"}>
          <CallbackRequestsPanel initialOpen={initialCallbackRequests} onOpenCountChange={setCallbackCount} />
        </div>
      </div>
    </div>
  );
}
