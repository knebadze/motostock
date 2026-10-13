"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { countOpenOrderRequests } from "@/lib/api/orders";
import { countOpenCallbackRequests } from "@/lib/api/callback-requests";
import { playNotificationSound } from "@/lib/playNotificationSound";

const POLL_INTERVAL_MS = 30000;

// Fired by OrderRequestsManager after resolving one, so the badge drops
// right away instead of on the next poll.
export const ORDER_REQUESTS_CHANGED_EVENT = "admin-order-requests-changed";

function inboxIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M12 7v4M12 14h.01" />
    </svg>
  );
}

// Next to AdminOrderNotifications (new orders) in the admin header — the
// customer cancel/return requests. Unlike the new-order bell, the badge is
// the number of OPEN requests (a to-do count), so it survives reloads and
// stays until someone handles them. A rise between polls plays the sound
// and toasts, same as a new order.
export function AdminOrderRequestNotifications() {
  const router = useRouter();
  const [openCount, setOpenCount] = useState(0);
  const lastCountRef = useRef<number | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const [orderCount, callbackCount] = await Promise.all([
          countOpenOrderRequests(),
          countOpenCallbackRequests(),
        ]);
        const count = orderCount + callbackCount;
        if (lastCountRef.current !== null && count > lastCountRef.current) {
          playNotificationSound();
          toast.warning("ახალი მოთხოვნა მომხმარებლისგან (გაუქმება/დაბრუნება ან დარეკვა)");
        }
        lastCountRef.current = count;
        setOpenCount(count);
      } catch {
        // Transient network/auth hiccup — next tick retries.
      }
    }

    void poll();
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_INTERVAL_MS);
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void poll();
    }
    const handleChanged = () => void poll();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(ORDER_REQUESTS_CHANGED_EVENT, handleChanged);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(ORDER_REQUESTS_CHANGED_EVENT, handleChanged);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.push("/admin/order-requests")}
      aria-label={openCount > 0 ? `${openCount} ღია მოთხოვნა` : "მომხმარებლის მოთხოვნები"}
      title="მომხმარებლის მოთხოვნები"
      className="relative flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary-text"
    >
      {inboxIcon()}
      {openCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
          {openCount > 9 ? "9+" : openCount}
        </span>
      )}
    </button>
  );
}
