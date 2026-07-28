"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FieldError } from "@/components/shared/FieldError";
import {
  createAttributeOption,
  deleteAttributeOption,
  listAttributeOptions,
  updateAttributeOption,
  type AttributeOption,
} from "@/lib/api/attribute-options";
import { ApiRequestError } from "@/lib/api/client";
import { attributeOptionFormSchema } from "@/lib/validation/attribute-options";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

const EMPTY_FORM = { key: "", labelKa: "", labelEn: "", labelRu: "" };

export function AttributeOptionsPanel({ attributeId }: { attributeId: number }) {
  const [options, setOptions] = useState<AttributeOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    let cancelled = false;

    listAttributeOptions(attributeId)
      .then((items) => {
        if (!cancelled) setOptions(items);
      })
      .catch(() => {
        toast.error("მნიშვნელობების ჩატვირთვა ვერ მოხერხდა");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [attributeId]);

  async function refresh() {
    setOptions(await listAttributeOptions(attributeId));
  }

  function handleEdit(option: AttributeOption) {
    setEditingId(option.id);
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
    setForm(EMPTY_FORM);
    setErrors({});
  }

  async function handleSubmit() {
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

    const input = {
      key: form.key.trim().toUpperCase(),
      label: { ka: form.labelKa.trim(), en: form.labelEn.trim(), ru: form.labelRu.trim() },
    };

    setSaving(true);
    try {
      if (editingId !== null) {
        await updateAttributeOption(attributeId, editingId, input);
        toast.success("მნიშვნელობა განახლდა");
      } else {
        await createAttributeOption(attributeId, input);
        toast.success("მნიშვნელობა დაემატა");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      await refresh();
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(option: AttributeOption) {
    try {
      await deleteAttributeOption(attributeId, option.id);
      if (editingId === option.id) handleCancelEdit();
      await refresh();
      toast.success("მნიშვნელობა წაიშალა");
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "წაშლა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  const columns: DataTableColumn<AttributeOption>[] = [
    { header: "Key", render: (option) => option.key, cellClassName: "font-mono text-muted-foreground" },
    { header: "სახელი", render: (option) => option.label.ka },
    { header: "სახელი (EN)", render: (option) => option.label.en, cellClassName: "text-muted-foreground" },
    { header: "სახელი (RU)", render: (option) => option.label.ru, cellClassName: "text-muted-foreground" },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <h3 className="text-sm font-semibold">მნიშვნელობები</h3>

      {loaded && (
        <DataTable
          columns={columns}
          data={options}
          getRowKey={(option) => option.id}
          emptyMessage="მნიშვნელობა არ არსებობს"
          actions={(option) => (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleEdit(option)}
                className="rounded-full px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                რედაქტირება
              </button>
              <button
                type="button"
                onClick={() => handleDelete(option)}
                className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
              >
                წაშლა
              </button>
            </div>
          )}
        />
      )}

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
            disabled={saving}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
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
