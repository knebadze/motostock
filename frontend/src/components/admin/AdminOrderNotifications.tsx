"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { listAllOrders } from "@/lib/api/orders";
import { playNotificationSound, unlockNotificationSound } from "@/lib/playNotificationSound";

const POLL_INTERVAL_MS = 20000;
const LAST_SEEN_ORDER_ID_KEY = "admin-last-seen-order-id";

function bellIcon() {
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
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

// Mounted once in AdminHeader.tsx, so it polls on every admin route. No
// WebSocket/SSE infra exists anywhere in this codebase — this follows the
// only existing precedent for "check for something new periodically"
// (ChatWidget.tsx's poll-while-open loop), just always-on instead of
// gated on a widget being open.
export function AdminOrderNotifications() {
  const router = useRouter();
  const [unseenCount, setUnseenCount] = useState(0);
  const lastSeenOrderIdRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    unlockNotificationSound();
    const unlockOnce = () => unlockNotificationSound();
    window.addEventListener("click", unlockOnce, { once: true });
    window.addEventListener("keydown", unlockOnce, { once: true });
    return () => {
      window.removeEventListener("click", unlockOnce);
      window.removeEventListener("keydown", unlockOnce);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_SEEN_ORDER_ID_KEY);
      if (stored) lastSeenOrderIdRef.current = Number(stored);
    } catch {
      // localStorage unavailable (private mode, blocked storage) — treated
      // the same as "never seen anything yet" below.
    }

    async function poll() {
      try {
        const page = await listAllOrders({ page: 1, pageSize: 1 });
        const newest = page.orders[0];
        if (!newest) return;

        // First-ever poll (no stored id, e.g. right after this feature
        // ships, or storage was cleared) — capture the current newest order
        // as the baseline silently, don't treat every pre-existing order as
        // "new".
        if (!initializedRef.current && lastSeenOrderIdRef.current === null) {
          initializedRef.current = true;
          lastSeenOrderIdRef.current = newest.id;
          try {
            localStorage.setItem(LAST_SEEN_ORDER_ID_KEY, String(newest.id));
          } catch {
            // Non-fatal — just means this baseline isn't persisted.
          }
          return;
        }

        if (lastSeenOrderIdRef.current !== null && newest.id > lastSeenOrderIdRef.current) {
          lastSeenOrderIdRef.current = newest.id;
          try {
            localStorage.setItem(LAST_SEEN_ORDER_ID_KEY, String(newest.id));
          } catch {
            // Non-fatal.
          }
          setUnseenCount((count) => count + 1);
          playNotificationSound();
          toast.success(
            `ახალი შეკვეთა — #${newest.orderCode} (${newest.buyer.firstName} ${newest.buyer.lastName}, ${Number(newest.total).toFixed(2)} ₾)`,
          );
        }
      } catch {
        // Transient network/auth hiccup — just try again on the next tick.
      }
    }

    void poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        setUnseenCount(0);
        router.push("/admin/orders");
      }}
      aria-label={unseenCount > 0 ? `${unseenCount} ახალი შეკვეთა` : "შეკვეთები"}
      title="შეკვეთები"
      className="relative flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {bellIcon()}
      {unseenCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {unseenCount > 9 ? "9+" : unseenCount}
        </span>
      )}
    </button>
  );
}
