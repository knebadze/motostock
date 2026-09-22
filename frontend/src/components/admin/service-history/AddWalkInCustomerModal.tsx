"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { DateInput } from "@/components/shared/DateInput";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { createWalkInUser, type AdminUser } from "@/lib/api/users";
import { ApiRequestError } from "@/lib/api/client";
import { walkInUserFormSchema } from "@/lib/validation/workshop";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function AddWalkInCustomerModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (user: AdminUser) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = walkInUserFormSchema.safeParse({ firstName, lastName, phone, dateOfBirth });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const user = await createWalkInUser(result.data);
      toast.success("სტუმარი მომხმარებელი დაემატა");
      onCreated(user);
      onClose();
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "დამატება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="ახალი სტუმარი მომხმარებელი">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          დაარეგისტრირეთ სახელოსნოში მისული მომხმარებელი საიტზე ანგარიშის გარეშე — თუ ის მომავალში
          თავად დარეგისტრირდება იმავე ტელეფონის ნომრით, ეს ჩანაწერი ავტომატურად გაერთიანდება მის
          ანგარიშთან.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="walkin-first-name" className="text-sm font-medium">
              სახელი *
            </label>
            <input
              id="walkin-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.firstName} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="walkin-last-name" className="text-sm font-medium">
              გვარი *
            </label>
            <input
              id="walkin-last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.lastName} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="walkin-phone" className="text-sm font-medium">
            ტელეფონის ნომერი *
          </label>
          <input
            id="walkin-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+995555123456"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.phone} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="walkin-dob" className="text-sm font-medium">
            დაბადების თარიღი *
          </label>
          <DateInput
            id="walkin-dob"
            value={dateOfBirth}
            onChange={setDateOfBirth}
          />
          <FieldError message={errors.dateOfBirth} />
        </div>

        <FormActions onCancel={onClose} loading={loading} submitLabel="დამატება" />
      </form>
    </Modal>
  );
}
