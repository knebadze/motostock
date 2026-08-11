"use client";

import { useLocale, useTranslations } from "next-intl";
import { SpecsList } from "@/components/shared/SpecsList";
import type { ProductAttributeValue } from "@/lib/api/products";

export function formatValue(
  value: ProductAttributeValue,
  locale: "ka" | "en" | "ru",
  yes: string,
  no: string,
): string {
  if (value.option) return value.option.label[locale];
  if (value.valueBoolean != null) return value.valueBoolean ? yes : no;
  const unitSuffix = value.unit ? ` ${value.unit.abbreviation[locale]}` : "";
  if (value.valueNumber != null) return `${value.valueNumber}${unitSuffix}`;
  return value.valueText != null ? `${value.valueText}${unitSuffix}` : "—";
}

export function ProductSpecs({ attributeValues }: { attributeValues: ProductAttributeValue[] }) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("ProductDetail");

  if (attributeValues.length === 0) return null;

  const rows = attributeValues.map((value) => ({
    label: value.attributeName[locale],
    value: formatValue(value, locale, t("yes"), t("no")),
  }));

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("specsHeading")}
      </h2>
      <SpecsList rows={rows} showAllLabel={t("showAllLabel")} collapseLabel={t("collapseLabel")} />
    </div>
  );
}
