"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { createUnit, updateUnit, type Unit } from "@/lib/api/units";
import { ApiRequestError } from "@/lib/api/client";
import { unitFormSchema } from "@/lib/validation/units";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function UnitFormModal({
  open,
  onClose,
  onSaved,
  unit,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  unit: Unit | null;
}) {
  const isEditing = unit !== null;

  const [nameKa, setNameKa] = useState(unit?.name.ka ?? "");
  const [nameEn, setNameEn] = useState(unit?.name.en ?? "");
  const [nameRu, setNameRu] = useState(unit?.name.ru ?? "");
  const [abbreviationKa, setAbbreviationKa] = useState(unit?.abbreviation.ka ?? "");
  const [abbreviationEn, setAbbreviationEn] = useState(unit?.abbreviation.en ?? "");
  const [abbreviationRu, setAbbreviationRu] = useState(unit?.abbreviation.ru ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = unitFormSchema.safeParse({
      name: { ka: nameKa, en: nameEn, ru: nameRu },
      abbreviation: { ka: abbreviationKa, en: abbreviationEn, ru: abbreviationRu },
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    setLoading(true);

    try {
      const input = {
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        abbreviation: {
          ka: abbreviationKa.trim(),
          en: abbreviationEn.trim(),
          ru: abbreviationRu.trim(),
        },
      };

      if (isEditing) {
        await updateUnit(unit.id, input);
      } else {
        await createUnit(input);
      }

      toast.success(isEditing ? "ერთეული განახლდა" : "ერთეული დაემატა");
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
    <Modal open={open} onClose={onClose} title={isEditing ? "ერთეულის რედაქტირება" : "ახალი ერთეული"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <LocalizedNameFields
          idPrefix="unit-name"
          value={{ ka: nameKa, en: nameEn, ru: nameRu }}
          onChange={(next) => {
            setNameKa(next.ka);
            setNameEn(next.en);
            setNameRu(next.ru);
          }}
          errors={{ ka: errors["name.ka"], en: errors["name.en"], ru: errors["name.ru"] }}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="unit-abbreviation-ka" className="text-sm font-medium">
              აბრევიატურა (ქართულად) *
            </label>
            <input
              id="unit-abbreviation-ka"
              value={abbreviationKa}
              onChange={(event) => setAbbreviationKa(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="მაგ. სმ"
            />
            <FieldError message={errors["abbreviation.ka"]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="unit-abbreviation-en" className="text-sm font-medium">
              აბრევიატურა (ინგლისურად) *
            </label>
            <input
              id="unit-abbreviation-en"
              value={abbreviationEn}
              onChange={(event) => setAbbreviationEn(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="მაგ. cm"
            />
            <FieldError message={errors["abbreviation.en"]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="unit-abbreviation-ru" className="text-sm font-medium">
              აბრევიატურა (რუსულად) *
            </label>
            <input
              id="unit-abbreviation-ru"
              value={abbreviationRu}
              onChange={(event) => setAbbreviationRu(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="მაგ. см"
            />
            <FieldError message={errors["abbreviation.ru"]} />
          </div>
        </div>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
