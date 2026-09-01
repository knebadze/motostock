"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { reorderOrder } from "@/lib/api/orders";
import { resolveApiErrorMessage } from "@/lib/api-errors";

export function ReorderButton({ orderId }: { orderId: number }) {
  const t = useTranslations("Account.orders");
  const tErrors = useTranslations("ApiErrors");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleReorder() {
    setLoading(true);
    try {
      const result = await reorderOrder(orderId);
      const added = result.items.filter((item) => item.status === "ADDED").length;
      const issues = result.items.filter((item) => item.status !== "ADDED").length;

      if (issues === 0) {
        toast.success(t("reorderAllAdded"));
      } else if (added === 0) {
        toast.error(t("reorderNoneAvailable"));
      } else {
        toast(t("reorderPartialSummary", { added, issues }));
      }

      if (added > 0) router.refresh();
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("reorderError")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleReorder}
      disabled={loading}
      className="shrink-0 rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
    >
      {loading ? t("reorderLoading") : t("reorderButton")}
    </button>
  );
}
