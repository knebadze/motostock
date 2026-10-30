import type { AdminFilterField } from "@/components/admin/shared/AdminFilterPanel";

export function buildBrandFilterFields(): AdminFilterField[] {
  return [{ key: "NAME", label: "სახელი", section: "ძირითადი", kind: "TEXT" }];
}
