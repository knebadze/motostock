"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { Tabs } from "@/components/shared/Tabs";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import {
  createAttribute,
  updateAttribute,
  type Attribute,
  type AttributeValueType,
} from "@/lib/api/attributes";
import { createAttributeOption, type AttributeOptionInput } from "@/lib/api/attribute-options";
import type { Category } from "@/lib/api/categories";
import type { Unit } from "@/lib/api/units";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree } from "@/lib/categories-tree";
import { attributeFormSchema } from "@/lib/validation/attributes";
import { attributeOptionFormSchema } from "@/lib/validation/attribute-options";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";
import { AttributeOptionsPanel } from "./AttributeOptionsPanel";

const VALUE_TYPE_OPTIONS: { value: AttributeValueType; label: string }[] = [
  { value: "TEXT", label: "ტექსტი" },
  { value: "NUMBER", label: "რიცხვი" },
  { value: "BOOLEAN", label: "დიახ/არა" },
  { value: "SELECT", label: "არჩევანი (სია)" },
];

type DraftOption = AttributeOptionInput & { draftId: number };

const EMPTY_DRAFT_FORM = { key: "", labelKa: "", labelEn: "", labelRu: "" };

function DraftOptionsEditor({
  options,
  onAdd,
  onEdit,
  onRemove,
}: {
  options: DraftOption[];
  onAdd: (option: AttributeOptionInput) => void;
  onEdit: (draftId: number, option: AttributeOptionInput) => void;
  onRemove: (draftId: number) => void;
}) {
  const [form, setForm] = useState(EMPTY_DRAFT_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const columns: DataTableColumn<DraftOption>[] = [
    { header: "Key", render: (option) => option.key, cellClassName: "font-mono text-muted-foreground" },
    { header: "სახელი", render: (option) => option.label.ka },
    { header: "სახელი (EN)", render: (option) => option.label.en, cellClassName: "text-muted-foreground" },
    { header: "სახელი (RU)", render: (option) => option.label.ru, cellClassName: "text-muted-foreground" },
  ];

  function handleStartEdit(option: DraftOption) {
    setEditingId(option.draftId);
    setForm({
      key: option.key,
      labelKa: option.label.ka,
      labelEn: option.label.en,
      labelRu: option.label.ru,
    });
    setErrors({});
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(EMPTY_DRAFT_FORM);
    setErrors({});
  }

  function handleRemove(draftId: number) {
    if (editingId === draftId) handleCancelEdit();
    onRemove(draftId);
  }

  function handleSubmit() {
    const result = attributeOptionFormSchema.safeParse({
      key: form.key.toUpperCase(),
      label: { ka: form.labelKa, en: form.labelEn, ru: form.labelRu },
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    const input: AttributeOptionInput = {
      key: form.key.trim().toUpperCase(),
      label: { ka: form.labelKa.trim(), en: form.labelEn.trim(), ru: form.labelRu.trim() },
    };

    if (editingId !== null) {
      onEdit(editingId, input);
    } else {
      onAdd(input);
    }
    setForm(EMPTY_DRAFT_FORM);
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <h3 className="text-sm font-semibold">მნიშვნელობები</h3>
      <p className="text-xs text-muted-foreground">
        დაამატეთ ერთი ან მეტი მნიშვნელობა — ისინი ატრიბუტთან ერთად შეინახება.
      </p>

      <DataTable
        columns={columns}
        data={options}
        getRowKey={(option) => option.draftId}
        emptyMessage="მნიშვნელობა ჯერ არ დამატებულა"
        actions={(option) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleStartEdit(option)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              რედაქტირება
            </button>
            <button
              type="button"
              onClick={() => handleRemove(option.draftId)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
            >
              წაშლა
            </button>
          </div>
        )}
      />

      <div className="grid gap-3 sm:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            placeholder="Key (მაგ. LEATHER)"
            value={form.key}
            onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value.toUpperCase() }))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
          <FieldError message={errors.key} />
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            placeholder="სახელი (ქართულად)"
            value={form.labelKa}
            onChange={(event) => setForm((prev) => ({ ...prev, labelKa: event.target.value }))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors["label.ka"]} />
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            placeholder="სახელი (ინგლისურად)"
            value={form.labelEn}
            onChange={(event) => setForm((prev) => ({ ...prev, labelEn: event.target.value }))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors["label.en"]} />
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            placeholder="სახელი (რუსულად)"
            value={form.labelRu}
            onChange={(event) => setForm((prev) => ({ ...prev, labelRu: event.target.value }))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors["label.ru"]} />
        </div>
        <div className="flex h-fit gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {editingId !== null ? "შენახვა" : "+ დამატება"}
          </button>
          {editingId !== null && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              გაუქმება
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AttributeFormModal({
  open,
  onClose,
  onSaved,
  categories,
  units,
  attribute,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  units: Unit[];
  attribute: Attribute | null;
}) {
  const isEditing = attribute !== null;
  const flatCategories = flattenTree(categories);

  const [categoryId, setCategoryId] = useState(attribute ? String(attribute.category.id) : "");
  const [nameKa, setNameKa] = useState(attribute?.name.ka ?? "");
  const [nameEn, setNameEn] = useState(attribute?.name.en ?? "");
  const [nameRu, setNameRu] = useState(attribute?.name.ru ?? "");
  const [valueType, setValueType] = useState<string>(attribute?.valueType ?? "TEXT");
  const [required, setRequired] = useState(attribute?.required ?? false);
  const [unitId, setUnitId] = useState(attribute?.unit ? String(attribute.unit.id) : "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [draftOptions, setDraftOptions] = useState<DraftOption[]>([]);
  const draftIdCounter = useRef(0);

  const categoryOptions = flatCategories.map((category) => ({
    value: String(category.id),
    label: `${"— ".repeat(category.depth)}${category.name.ka}`,
  }));

  const unitOptions = [
    { value: "", label: "არცერთი" },
    ...units.map((unit) => ({
      value: String(unit.id),
      label: `${unit.name.ka} (${unit.abbreviation.ka})`,
    })),
  ];

  function addDraftOption(option: AttributeOptionInput) {
    draftIdCounter.current += 1;
    setDraftOptions((prev) => [...prev, { ...option, draftId: draftIdCounter.current }]);
  }

  function editDraftOption(draftId: number, option: AttributeOptionInput) {
    setDraftOptions((prev) =>
      prev.map((existing) => (existing.draftId === draftId ? { ...option, draftId } : existing)),
    );
  }

  function removeDraftOption(draftId: number) {
    setDraftOptions((prev) => prev.filter((option) => option.draftId !== draftId));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = attributeFormSchema.safeParse({
      categoryId,
      name: { ka: nameKa, en: nameEn, ru: nameRu },
      valueType,
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
        categoryId: Number(categoryId),
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        valueType: valueType as AttributeValueType,
        required,
        unitId: unitId ? Number(unitId) : null,
      };

      if (isEditing) {
        await updateAttribute(attribute.id, input);
      } else {
        const created = await createAttribute(input);
        for (const option of draftOptions) {
          await createAttributeOption(created.id, { key: option.key, label: option.label });
        }
      }

      toast.success(isEditing ? "მახასიათებელი განახლდა" : "მახასიათებელი დაემატა");
      onSaved();
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const mainTabContent = (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="attribute-category" className="text-sm font-medium">
          კატეგორია *
        </label>
        <Select
          id="attribute-category"
          options={categoryOptions}
          value={categoryId}
          onChange={setCategoryId}
          searchable
          placeholder="აირჩიეთ კატეგორია"
        />
        <FieldError message={errors.categoryId} />
        <p className="text-xs text-muted-foreground">
          მახასიათებელი მემკვიდრეობით გადაეცემა ყველა შვილობილ კატეგორიასაც.
        </p>
      </div>

      <LocalizedNameFields
        idPrefix="attribute-name"
        value={{ ka: nameKa, en: nameEn, ru: nameRu }}
        onChange={(next) => {
          setNameKa(next.ka);
          setNameEn(next.en);
          setNameRu(next.ru);
        }}
        errors={{ ka: errors["name.ka"], en: errors["name.en"], ru: errors["name.ru"] }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="attribute-value-type" className="text-sm font-medium">
            ტიპი *
          </label>
          <Select
            id="attribute-value-type"
            options={VALUE_TYPE_OPTIONS}
            value={valueType}
            onChange={setValueType}
            disabled={isEditing}
          />
          <FieldError message={errors.valueType} />
          {isEditing && (
            <p className="text-xs text-muted-foreground">
              ტიპის შეცვლა შენახვის შემდეგ შეუძლებელია.
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
            className="size-4 rounded border-border accent-primary"
          />
          სავალდებულო ველია
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="attribute-unit" className="text-sm font-medium">
          ერთეული
        </label>
        <Select
          id="attribute-unit"
          options={unitOptions}
          value={unitId}
          onChange={setUnitId}
          searchable
          placeholder="არცერთი"
        />
        <FieldError message={errors.unitId} />
        <p className="text-xs text-muted-foreground">
          არასავალდებულოა — მითითების შემთხვევაში გამოჩნდება პროდუქტების გვერდზეც.
        </p>
      </div>
    </>
  );

  const tabs = [
    { key: "main", label: "ძირითადი", content: mainTabContent },
    ...(valueType === "SELECT"
      ? [
          {
            key: "options",
            label: "მნიშვნელობები",
            content: isEditing ? (
              <AttributeOptionsPanel attributeId={attribute.id} />
            ) : (
              <DraftOptionsEditor
                options={draftOptions}
                onAdd={addDraftOption}
                onEdit={editDraftOption}
                onRemove={removeDraftOption}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      title={isEditing ? "მახასიათებლის რედაქტირება" : "ახალი მახასიათებელი"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Tabs tabs={tabs} />
        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
