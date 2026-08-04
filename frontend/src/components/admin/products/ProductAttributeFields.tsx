"use client";

import { useEffect, useState } from "react";
import { listAttributes, type Attribute } from "@/lib/api/attributes";
import { listAttributeOptions, type AttributeOption } from "@/lib/api/attribute-options";
import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import type { AttributeFieldValue } from "@/lib/validation/products";
import type { FieldErrors } from "@/lib/validation/common";

function AttributeSelectField({
  attributeId,
  value,
  onChange,
}: {
  attributeId: number;
  value: string;
  onChange: (optionId: string) => void;
}) {
  const [options, setOptions] = useState<AttributeOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    listAttributeOptions(attributeId).then((items) => {
      if (!cancelled) setOptions(items);
    });
    return () => {
      cancelled = true;
    };
  }, [attributeId]);

  return (
    <Select
      options={options.map((option) => ({ value: String(option.id), label: option.label.ka }))}
      value={value}
      onChange={onChange}
      searchable
      placeholder="აირჩიეთ მნიშვნელობა"
    />
  );
}

export function ProductAttributeFields({
  categoryId,
  values,
  onChange,
  errors,
  onAttributesLoaded,
}: {
  categoryId: string;
  values: Record<string, AttributeFieldValue>;
  onChange: (attributeId: number, value: AttributeFieldValue) => void;
  errors: FieldErrors;
  onAttributesLoaded?: (attributes: Attribute[]) => void;
}) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!categoryId) return;

    let cancelled = false;
    listAttributes(Number(categoryId))
      .then((items) => {
        if (cancelled) return;
        setAttributes(items);
        onAttributesLoaded?.(items);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  if (!categoryId) {
    return <p className="text-sm text-muted-foreground">ჯერ აირჩიეთ კატეგორია.</p>;
  }
  if (!loaded) return null;
  if (attributes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        ამ კატეგორიას მახასიათებლები არ აქვს განსაზღვრული.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {attributes.map((attribute) => {
        const value = values[attribute.id] ?? {
          text: "",
          number: "",
          boolean: false,
          optionId: "",
        };
        const fieldError = errors[String(attribute.id)];

        return (
          <div key={attribute.id} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {attribute.name.ka}
              {attribute.unit ? ` (${attribute.unit.abbreviation.ka})` : ""}
              {attribute.required ? " *" : ""}
            </label>

            {attribute.valueType === "TEXT" && (
              <input
                type="text"
                value={value.text}
                onChange={(event) => onChange(attribute.id, { ...value, text: event.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            )}

            {attribute.valueType === "NUMBER" && (
              <input
                type="number"
                value={value.number}
                onChange={(event) =>
                  onChange(attribute.id, { ...value, number: event.target.value })
                }
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            )}

            {attribute.valueType === "BOOLEAN" && (
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={value.boolean}
                  onChange={(event) =>
                    onChange(attribute.id, { ...value, boolean: event.target.checked })
                  }
                  className="size-4 rounded border-border accent-primary"
                />
                კი
              </label>
            )}

            {attribute.valueType === "SELECT" && (
              <AttributeSelectField
                attributeId={attribute.id}
                value={value.optionId}
                onChange={(optionId) => onChange(attribute.id, { ...value, optionId })}
              />
            )}

            <FieldError message={fieldError} />
          </div>
        );
      })}
    </div>
  );
}
