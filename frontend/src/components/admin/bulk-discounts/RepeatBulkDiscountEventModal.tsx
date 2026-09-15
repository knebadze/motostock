"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FormActions } from "@/components/shared/FormActions";
import { repeatBulkDiscountEvent, type BulkDiscountEvent } from "@/lib/api/bulk-discount-events";
import { ApiRequestError } from "@/lib/api/client";

// Re-applies a past event's exact batch (same items, same percent, same
// name/description/image) at new dates, as a brand-new event row — see
// bulk-discount-events.service.ts's repeatEvent. Only asks for the two
// dates; everything else about the batch is fixed by the source event.
export function RepeatBulkDiscountEventModal({
  event,
  onClose,
  onRepeated,
}: {
  event: BulkDiscountEvent | null;
  onClose: () => void;
  onRepeated: () => void;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!event) return;
    if (!startDate || !endDate) {
      toast.error("გთხოვთ შეავსოთ ორივე თარიღი");
      return;
    }

    setLoading(true);
    try {
      await repeatBulkDiscountEvent(event.id, { startDate, endDate });
      toast.success("ივენთი გამეორდა");
      setStartDate("");
      setEndDate("");
      onRepeated();
      onClose();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "გამეორება ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={event !== null} onClose={onClose} title="ივენთის გამეორება">
      {event && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{event.nameKa}</span> ({event.discountPercent}%,{" "}
            {event.itemCount} ერთეული) ხელახლა გამოეყენება ზუსტად იმავე ერთეულებზე, ახალი პერიოდით.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">დაწყება *</label>
              <input
                type="date"
                value={startDate}
                onChange={(inputEvent) => setStartDate(inputEvent.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">დასრულება *</label>
              <input
                type="date"
                value={endDate}
                onChange={(inputEvent) => setEndDate(inputEvent.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <FormActions onCancel={onClose} loading={loading} submitLabel="გამეორება" />
        </form>
      )}
    </Modal>
  );
}
