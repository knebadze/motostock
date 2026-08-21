"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FormActions } from "@/components/shared/FormActions";
import { Toggle } from "@/components/shared/Toggle";
import { createServiceType, updateServiceType, type ServiceType } from "@/lib/api/service-types";
import { ApiRequestError } from "@/lib/api/client";
import { serviceTypeFormSchema } from "@/lib/validation/service-types";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function ServiceTypeFormModal({
  open,
  onClose,
  onSaved,
  serviceType,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  serviceType: ServiceType | null;
}) {
  const isEditing = serviceType !== null;

  const [nameKa, setNameKa] = useState(serviceType?.name.ka ?? "");
  const [nameEn, setNameEn] = useState(serviceType?.name.en ?? "");
  const [nameRu, setNameRu] = useState(serviceType?.name.ru ?? "");
  const [hasPositionOption, setHasPositionOption] = useState(serviceType?.hasPositionOption ?? false);
  const [hasFilterOption, setHasFilterOption] = useState(serviceType?.hasFilterOption ?? false);
  const [defaultPrice, setDefaultPrice] = useState(
    serviceType?.defaultPrice != null ? String(serviceType.defaultPrice) : "",
  );
  const [isActive, setIsActive] = useState(serviceType?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = serviceTypeFormSchema.safeParse({
      name: { ka: nameKa, en: nameEn, ru: nameRu },
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    const priceValue = defaultPrice.trim() === "" ? null : Number(defaultPrice);
    if (priceValue != null && (Number.isNaN(priceValue) || priceValue < 0)) {
      toast.error("შეიყვანეთ სწორი ფასი");
      return;
    }

    setLoading(true);
    try {
      const input = {
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        hasPositionOption,
        hasFilterOption,
        defaultPrice: priceValue,
        isActive,
      };

      if (isEditing) {
        await updateServiceType(serviceType.id, input);
      } else {
        await createServiceType(input);
      }

      toast.success(isEditing ? "სერვისის ტიპი განახლდა" : "სერვისის ტიპი დაემატა");
      onSaved();
      onClose();
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "სერვისის ტიპის რედაქტირება" : "ახალი სერვისის ტიპი"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <LocalizedNameFields
          idPrefix="service-type-name"
          value={{ ka: nameKa, en: nameEn, ru: nameRu }}
          onChange={(next) => {
            setNameKa(next.ka);
            setNameEn(next.en);
            setNameRu(next.ru);
          }}
          errors={{ ka: errors["name.ka"], en: errors["name.en"], ru: errors["name.ru"] }}
        />

        <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-medium">დამატებითი ველები ჩაწერისას</p>
            <p className="text-xs text-muted-foreground">
              კილომეტრაჟი და თარიღი ყოველთვის ჩაიწერება — ეს ორი დამატებით ჩართავს შესაბამის ველს
              მხოლოდ ამ ტიპის სერვისისთვის.
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Toggle checked={hasPositionOption} onChange={setHasPositionOption} />
            პოზიცია (წინა/უკანა/ორივე) — ხუნდები, დისკები, სამუხრუჭე სითხე, საბურავები, საკისრები...
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Toggle checked={hasFilterOption} onChange={setHasFilterOption} />
            ფილტრიც შეიცვალა? (კი/არა) — მაგ. ზეთის შეცვლისას
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="service-type-price" className="text-sm font-medium">
            ნაგულისხმევი ფასი (₾)
          </label>
          <input
            id="service-type-price"
            type="number"
            min={0}
            step="0.01"
            value={defaultPrice}
            onChange={(event) => setDefaultPrice(event.target.value)}
            placeholder="არჩევითი"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            სერვისის ჩაწერისას ავტომატურად ჩაისმება, თუმცა ცალკეულ ჩანაწერზე თავისუფლად შესაცვლელია.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm font-medium">
          <Toggle checked={isActive} onChange={setIsActive} />
          აქტიურია (ჩანს სერვისის დამატების ფორმაში)
        </label>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
