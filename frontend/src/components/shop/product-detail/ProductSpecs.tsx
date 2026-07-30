"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ProductAttributeValue } from "@/lib/api/products";

function formatValue(
  value: ProductAttributeValue,
  locale: "ka" | "en" | "ru",
  yes: string,
  no: string,
): string {
  if (value.option) return value.option.label[locale];
  if (value.valueBoolean != null) return value.valueBoolean ? yes : no;
  if (value.valueNumber != null) return String(value.valueNumber);
  return value.valueText ?? "—";
}

export function ProductSpecs({ attributeValues }: { attributeValues: ProductAttributeValue[] }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("ProductDetail");

  if (attributeValues.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("specsHeading")}
      </h2>
      <dl className="flex flex-col gap-2">
        {attributeValues.map((value) => (
          <div
            key={value.attributeId}
            className="flex items-center justify-between gap-4 border-b border-border py-1.5 text-sm"
          >
            <dt className="text-muted-foreground">{value.attributeName[locale]}</dt>
            <dd className="font-medium text-foreground">
              {formatValue(value, locale, t("yes"), t("no"))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
