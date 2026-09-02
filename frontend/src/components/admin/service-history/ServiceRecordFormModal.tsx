"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FormActions } from "@/components/shared/FormActions";
import { Select } from "@/components/shared/Select";
import {
  createServiceRecord,
  updateServiceRecord,
  type ServicePosition,
  type ServiceRecord,
} from "@/lib/api/service-records";
import type { ServiceType } from "@/lib/api/service-types";
import type { TeamMember } from "@/lib/api/team-members";
import { ApiRequestError } from "@/lib/api/client";

const OTHER_VALUE = "__other__";

const POSITION_OPTIONS: { value: ServicePosition; label: string }[] = [
  { value: "FRONT", label: "წინა" },
  { value: "REAR", label: "უკანა" },
  { value: "BOTH", label: "ორივე" },
];

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ServiceRecordFormModal({
  open,
  onClose,
  onSaved,
  garageVehicleId,
  serviceTypes,
  teamMembers,
  record,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  garageVehicleId: number;
  serviceTypes: ServiceType[];
  teamMembers: TeamMember[];
  record: ServiceRecord | null;
}) {
  const isEditing = record !== null;

  const [serviceTypeChoice, setServiceTypeChoice] = useState(
    record ? String(record.serviceTypeId ?? OTHER_VALUE) : "",
  );
  const [customServiceName, setCustomServiceName] = useState(record?.customServiceName ?? "");
  const [mileageKm, setMileageKm] = useState(record ? String(record.mileageKm) : "");
  const [performedAt, setPerformedAt] = useState(record?.performedAt ?? todayDateString());
  const [position, setPosition] = useState<ServicePosition | "">(record?.position ?? "");
  const [filterChanged, setFilterChanged] = useState(record?.filterChanged ?? false);
  const [price, setPrice] = useState(record?.price != null ? String(record.price) : "");
  const [mechanicId, setMechanicId] = useState(record?.mechanicId ? String(record.mechanicId) : "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [loading, setLoading] = useState(false);

  const activeServiceTypes = serviceTypes.filter((type) => type.isActive);
  const serviceTypeOptions = [
    ...activeServiceTypes.map((type) => ({ value: String(type.id), label: type.name.ka })),
    { value: OTHER_VALUE, label: "სხვა (ხელით)" },
  ];
  const activeTeamMembers = teamMembers.filter((member) => member.isActive);
  const mechanicOptions = activeTeamMembers.map((member) => ({
    value: String(member.id),
    label: `${member.name.ka} (${member.role.ka})`,
  }));

  const selectedServiceType =
    serviceTypeChoice && serviceTypeChoice !== OTHER_VALUE
      ? serviceTypes.find((type) => String(type.id) === serviceTypeChoice)
      : undefined;
  const isOther = serviceTypeChoice === OTHER_VALUE;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!isEditing && !serviceTypeChoice) {
      toast.error("აირჩიეთ სერვისის ტიპი");
      return;
    }
    if (!isEditing && isOther && !customServiceName.trim()) {
      toast.error("შეიყვანეთ სერვისის დასახელება");
      return;
    }
    const mileage = Number(mileageKm);
    if (mileageKm.trim() === "" || Number.isNaN(mileage) || mileage < 0) {
      toast.error("შეიყვანეთ სწორი კილომეტრაჟი");
      return;
    }
    if (!performedAt) {
      toast.error("აირჩიეთ თარიღი");
      return;
    }
    const priceValue = price.trim() === "" ? null : Number(price);
    if (priceValue != null && (Number.isNaN(priceValue) || priceValue < 0)) {
      toast.error("შეიყვანეთ სწორი ფასი");
      return;
    }

    setLoading(true);
    try {
      let saved: ServiceRecord;
      if (isEditing) {
        saved = await updateServiceRecord(record.id, {
          mileageKm: mileage,
          performedAt,
          position: selectedTypeHasPosition() ? position || null : null,
          filterChanged: selectedTypeHasFilter() ? filterChanged : null,
          price: priceValue,
          mechanicId: mechanicId ? Number(mechanicId) : null,
          notes: notes.trim() || null,
        });
        toast.success("ჩანაწერი განახლდა");
      } else {
        saved = await createServiceRecord({
          garageVehicleId,
          ...(isOther
            ? { customServiceName: customServiceName.trim() }
            : { serviceTypeId: Number(serviceTypeChoice) }),
          mileageKm: mileage,
          performedAt,
          position: selectedServiceType?.hasPositionOption && position ? position : undefined,
          filterChanged: selectedServiceType?.hasFilterOption ? filterChanged : undefined,
          price: priceValue ?? undefined,
          mechanicId: mechanicId ? Number(mechanicId) : undefined,
          notes: notes.trim() || undefined,
        });
        toast.success("სერვისი ჩაიწერა");
      }
      // Non-blocking — the record is already saved either way; this just
      // flags a likely typo against this vehicle's other records (see
      // backend's checkMileageMonotonicity) for the admin to double-check.
      if (saved.mileageWarning) {
        toast.warning(saved.mileageWarning);
      }
      onSaved();
      onClose();
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  // Edit mode has no serviceTypes-list-derived selection to fall back on
  // (the type itself isn't re-editable — see ServiceRecord.schema.ts's
  // update schema) — resolve the original type's flags straight from the
  // record being edited instead.
  function selectedTypeHasPosition(): boolean {
    if (!isEditing) return Boolean(selectedServiceType?.hasPositionOption);
    const original = serviceTypes.find((type) => type.id === record.serviceTypeId);
    return Boolean(original?.hasPositionOption);
  }

  function selectedTypeHasFilter(): boolean {
    if (!isEditing) return Boolean(selectedServiceType?.hasFilterOption);
    const original = serviceTypes.find((type) => type.id === record.serviceTypeId);
    return Boolean(original?.hasFilterOption);
  }

  const showPosition = isEditing ? selectedTypeHasPosition() : Boolean(selectedServiceType?.hasPositionOption);
  const showFilter = isEditing ? selectedTypeHasFilter() : Boolean(selectedServiceType?.hasFilterOption);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "სერვისის ჩანაწერის რედაქტირება" : "სერვისის დამატება"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isEditing ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">სერვისი</span>
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {record.serviceTypeName?.ka ?? record.customServiceName}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="service-record-type" className="text-sm font-medium">
              სერვისი *
            </label>
            <Select
              id="service-record-type"
              options={serviceTypeOptions}
              value={serviceTypeChoice}
              onChange={(value) => {
                setServiceTypeChoice(value);
                setPosition("");
                setFilterChanged(false);
                const nextType = serviceTypes.find((type) => String(type.id) === value);
                setPrice(nextType?.defaultPrice != null ? String(nextType.defaultPrice) : "");
              }}
              searchable
              placeholder="აირჩიეთ სერვისის ტიპი"
            />
          </div>
        )}

        {!isEditing && isOther && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="service-record-custom-name" className="text-sm font-medium">
              სერვისის დასახელება *
            </label>
            <input
              id="service-record-custom-name"
              value={customServiceName}
              onChange={(event) => setCustomServiceName(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="service-record-mileage" className="text-sm font-medium">
              კილომეტრაჟი *
            </label>
            <input
              id="service-record-mileage"
              type="number"
              min={0}
              value={mileageKm}
              onChange={(event) => setMileageKm(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="service-record-date" className="text-sm font-medium">
              თარიღი *
            </label>
            <input
              id="service-record-date"
              type="date"
              value={performedAt}
              onChange={(event) => setPerformedAt(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="service-record-price" className="text-sm font-medium">
              ფასი (₾)
            </label>
            <input
              id="service-record-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="არჩევითი"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="service-record-mechanic" className="text-sm font-medium">
              ხელოსანი
            </label>
            <Select
              id="service-record-mechanic"
              options={mechanicOptions}
              value={mechanicId}
              onChange={setMechanicId}
              searchable
              placeholder="აირჩიეთ ხელოსანი"
            />
          </div>
        </div>

        {showPosition && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="service-record-position" className="text-sm font-medium">
              პოზიცია
            </label>
            <Select
              id="service-record-position"
              options={POSITION_OPTIONS}
              value={position}
              onChange={(value) => setPosition(value as ServicePosition)}
              placeholder="აირჩიეთ პოზიცია"
            />
          </div>
        )}

        {showFilter && (
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={filterChanged}
              onChange={(event) => setFilterChanged(event.target.checked)}
              className="size-4 rounded border-border accent-primary"
            />
            ფილტრიც შეიცვალა
          </label>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="service-record-notes" className="text-sm font-medium">
            შენიშვნა
          </label>
          <textarea
            id="service-record-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
