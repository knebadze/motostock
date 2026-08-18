import type { Product, ProductAttributeValueInput } from "@/lib/api/products";
import type { Attribute } from "@/lib/api/attributes";
import type { AttributeFieldValue } from "@/lib/validation/products";

export function toAttributeFieldValues(product: Product | null): Record<string, AttributeFieldValue> {
  if (!product) return {};
  const result: Record<string, AttributeFieldValue> = {};
  for (const value of product.attributeValues) {
    result[String(value.attributeId)] = {
      text: value.valueText ?? "",
      number: value.valueNumber != null ? String(value.valueNumber) : "",
      boolean: value.valueBoolean ?? false,
      optionId: value.option ? String(value.option.id) : "",
    };
  }
  return result;
}

const EMPTY_ATTRIBUTE_FIELD_VALUE: AttributeFieldValue = {
  text: "",
  number: "",
  boolean: false,
  optionId: "",
};

// Attributes the admin hasn't touched yet have no entry in `attributeValues`
// (ProductAttributeFields only writes an entry on change) — the validation
// schema requires a full object per attribute id, so fill the gaps with the
// same default used for rendering before parsing.
export function withAttributeDefaults(
  values: Record<string, AttributeFieldValue>,
  attributes: Attribute[],
): Record<string, AttributeFieldValue> {
  const filled: Record<string, AttributeFieldValue> = { ...values };
  for (const attribute of attributes) {
    filled[String(attribute.id)] ??= EMPTY_ATTRIBUTE_FIELD_VALUE;
  }
  return filled;
}

export function toAttributeValueInputs(
  values: Record<string, AttributeFieldValue>,
  attributes: Attribute[],
): ProductAttributeValueInput[] {
  const inputs: ProductAttributeValueInput[] = [];

  for (const attribute of attributes) {
    const value = values[String(attribute.id)];
    if (!value) continue;

    if (attribute.valueType === "TEXT" && value.text.trim() !== "") {
      inputs.push({ attributeId: attribute.id, valueText: value.text.trim() });
    } else if (attribute.valueType === "NUMBER" && value.number.trim() !== "") {
      inputs.push({ attributeId: attribute.id, valueNumber: Number(value.number) });
    } else if (attribute.valueType === "BOOLEAN") {
      inputs.push({ attributeId: attribute.id, valueBoolean: value.boolean });
    } else if (attribute.valueType === "SELECT" && value.optionId.trim() !== "") {
      inputs.push({ attributeId: attribute.id, optionId: Number(value.optionId) });
    }
  }

  return inputs;
}
