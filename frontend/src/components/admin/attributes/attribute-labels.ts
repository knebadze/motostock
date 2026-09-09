import type { AttributeValueType } from "@/lib/api/attributes";

// Single source for the attribute valueType -> label mapping — used to be
// hand-copied verbatim as a Record in AttributesManager.tsx (the list) and
// as an options array in AttributeFormModal.tsx (the form picker).
export const VALUE_TYPE_LABELS: Record<AttributeValueType, string> = {
  TEXT: "ტექსტი",
  NUMBER: "რიცხვი",
  BOOLEAN: "დიახ/არა",
  SELECT: "არჩევანი (სია)",
};

export const VALUE_TYPE_OPTIONS = (Object.keys(VALUE_TYPE_LABELS) as AttributeValueType[]).map(
  (value) => ({ value, label: VALUE_TYPE_LABELS[value] }),
);
