"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  createProductFitmentRule,
  deleteProductFitmentRule,
  listProductFitmentRules,
  type ProductFitmentRule,
  type ProductFitmentRuleType,
} from "@/lib/api/product-fitment-rules";
import type { Category } from "@/lib/api/categories";
import type { LookupItem } from "@/lib/api/lookups";
import type { VehicleSpecField } from "@/lib/api/vehicle-category-filters";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree, isVehicleCategory } from "@/lib/categories-tree";
import { VEHICLE_SPEC_FIELDS } from "@/config/vehicle-spec-fields";

// Field id/id-map keyed by VehicleSpecField, only for the LOOKUP-kind
// fields — the only ones a "this spec equals that value" rule makes sense
// for (not open-ended NUMBER/BOOLEAN ranges).
export type VehicleSpecLookupMap = Partial<Record<VehicleSpecField, LookupItem[]>>;

const RULE_TYPE_OPTIONS: { value: ProductFitmentRuleType; label: string }[] = [
  { value: "CATEGORY", label: "ტრანსპორტის კატეგორია" },
  { value: "SPEC", label: "მახასიათებელი" },
  { value: "ALL", label: "ყველა ტრანსპორტი" },
];

const SPEC_FIELD_OPTIONS = VEHICLE_SPEC_FIELDS.filter((item) => item.kind === "LOOKUP");

function ruleLabel(rule: ProductFitmentRule): string {
  if (rule.type === "ALL") return "ყველა ტრანსპორტთან თავსებადი";
  if (rule.type === "CATEGORY") return `კატეგორია: ${rule.category?.name.ka ?? "—"}`;
  return `${rule.specFieldLabel?.ka ?? ""}: ${rule.specValue?.nameKa ?? "—"}`;
}

const ruleColumns: DataTableColumn<ProductFitmentRule>[] = [
  { header: "წესი", render: ruleLabel },
];

export function FitmentRulesEditor({
  productId,
  categories,
  vehicleSpecLookups,
}: {
  productId: number;
  categories: Category[];
  vehicleSpecLookups: VehicleSpecLookupMap;
}) {
  const [rules, setRules] = useState<ProductFitmentRule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newRuleType, setNewRuleType] = useState<ProductFitmentRuleType>("CATEGORY");
  const [newRuleCategoryId, setNewRuleCategoryId] = useState("");
  const [newRuleSpecField, setNewRuleSpecField] = useState("");
  const [newRuleSpecValueId, setNewRuleSpecValueId] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingRule, setDeletingRule] = useState<ProductFitmentRule | null>(null);
  const ruleTypeSelectId = useId();
  const ruleCategorySelectId = useId();
  const ruleSpecFieldSelectId = useId();
  const ruleSpecValueSelectId = useId();

  useEffect(() => {
    let cancelled = false;

    listProductFitmentRules(productId)
      .then((items) => {
        if (!cancelled) setRules(items);
      })
      .catch(() => {
        toast.error("თავსებადობის წესების ჩატვირთვა ვერ მოხერხდა");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const vehicleCategoryOptions = useMemo(() => {
    const vehicleCategories = categories.filter((category) =>
      isVehicleCategory(categories, category.id),
    );
    return flattenTree(vehicleCategories).map((category) => ({
      value: String(category.id),
      label: `${"— ".repeat(category.depth)}${category.name.ka}`,
    }));
  }, [categories]);

  const specFieldOptions = SPEC_FIELD_OPTIONS.map((item) => ({ value: item.field, label: item.label }));
  const specValueOptions = useMemo(() => {
    const items = vehicleSpecLookups[newRuleSpecField as VehicleSpecField] ?? [];
    return items.map((item) => ({ value: String(item.id), label: item.nameKa }));
  }, [vehicleSpecLookups, newRuleSpecField]);

  async function refresh() {
    setRules(await listProductFitmentRules(productId));
  }

  function resetNewRuleFields() {
    setNewRuleCategoryId("");
    setNewRuleSpecField("");
    setNewRuleSpecValueId("");
  }

  async function handleAddRule() {
    if (newRuleType === "CATEGORY" && !newRuleCategoryId) {
      toast.error("აირჩიეთ კატეგორია");
      return;
    }
    if (newRuleType === "SPEC" && (!newRuleSpecField || !newRuleSpecValueId)) {
      toast.error("აირჩიეთ მახასიათებელი და მნიშვნელობა");
      return;
    }

    setAdding(true);
    try {
      await createProductFitmentRule(productId, {
        type: newRuleType,
        categoryId: newRuleType === "CATEGORY" ? Number(newRuleCategoryId) : undefined,
        specField: newRuleType === "SPEC" ? (newRuleSpecField as VehicleSpecField) : undefined,
        specLookupItemId: newRuleType === "SPEC" ? Number(newRuleSpecValueId) : undefined,
      });
      resetNewRuleFields();
      await refresh();
      toast.success("წესი დაემატა");
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "დამატება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteRule() {
    if (!deletingRule) return;
    await deleteProductFitmentRule(productId, deletingRule.id);
    await refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        დამატებითი გზა ცალკეული ტექნიკის ხელით არჩევის ნაცვლად — ეს პროდუქტი ავტომატურად
        თავსებადი გახდება მთელ ტრანსპორტის კატეგორიასთან, კონკრეტულ მახასიათებელთან (მაგ.
        ყველა ჯაჭვიან ტრანსპორტთან), ან ყველა ტექნიკასთან. ახალი კატალოგის ჩანაწერებიც
        ავტომატურად მოექცევა წესის ქვეშ.
      </p>
      {rules.length > 1 && (
        <p className="text-xs text-amber-600">
          რამდენიმე წესის დამატებისას საკმარისია მხოლოდ ერთის დაკმაყოფილება — პროდუქტი
          თავსებადი გახდება ტექნიკასთან, რომელიც ემთხვევა თუნდაც ერთ წესს (და არა
          აუცილებლად ყველას ერთდროულად). მაგალითად, ორი მახასიათებლის წესი („საწვავის ტიპი:
          ბენზინი“ და „გადაცემათა კოლოფი: მექანიკური“) ერთად ნიშნავს „ბენზინიანი ან
          მექანიკური“, არა „ბენზინიანი და მექანიკური ერთდროულად“.
        </p>
      )}

      {loaded && (
        <DataTable
          columns={ruleColumns}
          data={rules}
          getRowKey={(rule) => rule.id}
          emptyMessage="წესი არ არის დამატებული"
          actions={(rule) => (
            <button
              type="button"
              onClick={() => setDeletingRule(rule)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
            >
              წაშლა
            </button>
          )}
        />
      )}

      <ConfirmDialog
        open={deletingRule !== null}
        onClose={() => setDeletingRule(null)}
        title="თავსებადობის წესის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ წესი{" "}
            <span className="font-semibold text-foreground">
              {deletingRule ? ruleLabel(deletingRule) : ""}
            </span>
            ? ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="წესი წაიშალა"
        onConfirm={handleDeleteRule}
      />

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={ruleTypeSelectId} className="text-sm font-medium">
            ტიპი
          </label>
          <Select
            id={ruleTypeSelectId}
            options={RULE_TYPE_OPTIONS}
            value={newRuleType}
            onChange={(value) => {
              setNewRuleType(value as ProductFitmentRuleType);
              resetNewRuleFields();
            }}
          />
        </div>

        {newRuleType === "CATEGORY" && (
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor={ruleCategorySelectId} className="text-sm font-medium">
              კატეგორია
            </label>
            <Select
              id={ruleCategorySelectId}
              options={vehicleCategoryOptions}
              value={newRuleCategoryId}
              onChange={setNewRuleCategoryId}
              searchable
              placeholder="აირჩიეთ ტრანსპორტის კატეგორია"
            />
          </div>
        )}

        {newRuleType === "SPEC" && (
          <>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor={ruleSpecFieldSelectId} className="text-sm font-medium">
                მახასიათებელი
              </label>
              <Select
                id={ruleSpecFieldSelectId}
                options={specFieldOptions}
                value={newRuleSpecField}
                onChange={(value) => {
                  setNewRuleSpecField(value);
                  setNewRuleSpecValueId("");
                }}
                placeholder="აირჩიეთ მახასიათებელი"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor={ruleSpecValueSelectId} className="text-sm font-medium">
                მნიშვნელობა
              </label>
              <Select
                id={ruleSpecValueSelectId}
                options={specValueOptions}
                value={newRuleSpecValueId}
                onChange={setNewRuleSpecValueId}
                searchable
                disabled={!newRuleSpecField}
                placeholder="აირჩიეთ მნიშვნელობა"
              />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={handleAddRule}
          disabled={adding}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          + წესის დამატება
        </button>
      </div>
    </div>
  );
}
