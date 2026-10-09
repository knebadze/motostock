"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { resolveOrderFinaSync, type AdminOrder } from "@/lib/api/orders";

// Shown for a FINA push whose outcome is unknown (order.finaPushUncertain) —
// FINA may or may not have saved the document, so a blind retry could
// record it twice. The admin checks FINA and answers here instead (see the
// backend's resolveOrderFinaPush):
//   "FINA-ში არის"    — the document is there; for a sale, with its FINA
//                        operation id (a later return references it).
//   "FINA-ში არ არის" — it isn't; the system sends it again.
export function FinaResolvePanel({
  order,
  onResolved,
}: {
  order: AdminOrder;
  onResolved: (updated: AdminOrder) => void;
}) {
  const [operationId, setOperationId] = useState("");
  const [confirming, setConfirming] = useState<"RECORDED" | "NOT_RECORDED" | null>(null);

  const isCancelled = order.status.key === "CANCELLED";
  // The outstanding document: the return once a confirmed sale was
  // cancelled, otherwise the sale itself (mirrors the backend).
  const pendingDocument = isCancelled && order.finaOutOperationId != null ? "return" : "sale";
  const needsOperationId = pendingDocument === "sale";
  const parsedOperationId = Number(operationId);
  const operationIdValid = Number.isInteger(parsedOperationId) && parsedOperationId > 0;
  const documentName = pendingDocument === "sale" ? "გაყიდვის" : "დაბრუნების";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <p className="text-xs font-medium text-foreground">
        შეამოწმეთ FINA-ში, არის თუ არა ამ შეკვეთის {documentName} დოკუმენტი, და მონიშნეთ შედეგი.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {needsOperationId && (
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={operationId}
            onChange={(event) => setOperationId(event.target.value)}
            placeholder="ოპერაციის ნომერი FINA-ში"
            aria-label="გაყიდვის ოპერაციის ნომერი FINA-ში"
            className="w-52 rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
          />
        )}
        <button
          type="button"
          onClick={() => setConfirming("RECORDED")}
          disabled={needsOperationId && !operationIdValid}
          className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          FINA-ში არის
        </button>
        <button
          type="button"
          onClick={() => setConfirming("NOT_RECORDED")}
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          FINA-ში არ არის
        </button>
      </div>

      <ConfirmDialog
        open={confirming != null}
        onClose={() => setConfirming(null)}
        title={confirming === "RECORDED" ? "დოკუმენტი FINA-შია" : "დოკუმენტი FINA-ში არ არის"}
        message={
          confirming === "RECORDED"
            ? needsOperationId
              ? `დარწმუნებული ხართ, რომ გაყიდვა FINA-შია ოპერაციის ნომრით ${operationId}? სისტემა მას აღარ გაგზავნის${
                  isCancelled ? ", და გაუქმებისთვის დაბრუნებას გაგზავნის" : ""
                }.`
              : "დარწმუნებული ხართ, რომ დაბრუნება FINA-შია? სისტემა მას აღარ გაგზავნის."
            : isCancelled && pendingDocument === "sale"
              ? "დარწმუნებული ხართ, რომ გაყიდვა FINA-ში არ არის? შეკვეთა გაუქმებულია, ამიტომ FINA-ში არაფერი გაიგზავნება."
              : `დარწმუნებული ხართ, რომ ${documentName} დოკუმენტი FINA-ში არ არის? სისტემა მას თავიდან გაგზავნის — თუ ის უკვე იქ არის, გაორმაგდება.`
        }
        confirmLabel="დადასტურება"
        successMessage="შენახულია"
        onConfirm={async () => {
          const updated = await resolveOrderFinaSync(
            order.id,
            confirming === "RECORDED"
              ? { outcome: "RECORDED", ...(needsOperationId ? { finaOperationId: parsedOperationId } : {}) }
              : { outcome: "NOT_RECORDED" },
          );
          onResolved(updated);
        }}
      />
    </div>
  );
}
