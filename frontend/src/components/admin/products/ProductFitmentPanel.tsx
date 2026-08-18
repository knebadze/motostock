"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  createProductFitment,
  deleteProductFitment,
  listProductFitments,
  type ProductFitment,
} from "@/lib/api/product-fitment";
import {
  createProductFitmentRule,
  deleteProductFitmentRule,
  listProductFitmentRules,
  type ProductFitmentRule,
  type ProductFitmentRuleType,
} from "@/lib/api/product-fitment-rules";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import type { Category } from "@/lib/api/categories";
import type { LookupItem } from "@/lib/api/lookups";
import type { VehicleSpecField } from "@/lib/api/vehicle-category-filters";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree, isVehicleCategory } from "@/lib/categories-tree";
import { VEHICLE_SPEC_FIELDS } from "@/config/vehicle-spec-fields";

function vehicleCatalogLabel(entry: VehicleCatalogEntry): string {
  const year =
    entry.yearFrom || entry.yearTo ? ` (${entry.yearFrom ?? "?"}–${entry.yearTo ?? "?"})` : "";
  const variant = entry.variant ? ` — ${entry.variant}` : "";
  return `${entry.brand.name} ${entry.model.name}${variant}${year}`;
}

// fitment.vehicleCatalog is a narrower shape than VehicleCatalogEntry (no
// category/spec fields), so it can't just be passed to vehicleCatalogLabel
// above — same formatting, kept as its own function instead of duplicating
// the string-building inline a second time (once for the table column, once
// for the delete-confirmation message below).
function fitmentLabel(fitment: ProductFitment): string {
  const { vehicleCatalog } = fitment;
  const year =
    vehicleCatalog.yearFrom || vehicleCatalog.yearTo
      ? ` (${vehicleCatalog.yearFrom ?? "?"}–${vehicleCatalog.yearTo ?? "?"})`
      : "";
  const variant = vehicleCatalog.variant ? ` — ${vehicleCatalog.variant}` : "";
  return `${vehicleCatalog.brand.name} ${vehicleCatalog.model.name}${variant}${year}`;
}

const columns: DataTableColumn<ProductFitment>[] = [
  { header: "ტექნიკა", render: fitmentLabel },
];

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

function FitmentRulesEditor({
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

export function ProductFitmentPanel({
  productId,
  vehicleCatalog,
  categories,
  vehicleSpecLookups,
}: {
  productId: number;
  vehicleCatalog: VehicleCatalogEntry[];
  categories: Category[];
  vehicleSpecLookups: VehicleSpecLookupMap;
}) {
  const [fitments, setFitments] = useState<ProductFitment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [vehicleCatalogId, setVehicleCatalogId] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingFitment, setDeletingFitment] = useState<ProductFitment | null>(null);

  useEffect(() => {
    let cancelled = false;

    listProductFitments(productId)
      .then((items) => {
        if (!cancelled) setFitments(items);
      })
      .catch(() => {
        toast.error("თავსებადობის ჩატვირთვა ვერ მოხერხდა");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const attachedIds = new Set(fitments.map((fitment) => fitment.vehicleCatalog.id));
  const options = useMemo(
    () =>
      vehicleCatalog
        .filter((entry) => !attachedIds.has(entry.id))
        .map((entry) => ({ value: String(entry.id), label: vehicleCatalogLabel(entry) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicleCatalog, fitments],
  );

  async function refresh() {
    setFitments(await listProductFitments(productId));
  }

  async function handleAdd() {
    if (!vehicleCatalogId) {
      toast.error("აირჩიეთ ტექნიკა");
      return;
    }

    setAdding(true);
    try {
      await createProductFitment(productId, Number(vehicleCatalogId));
      setVehicleCatalogId("");
      await refresh();
      toast.success("თავსებადობა დაემატა");
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "დამატება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete() {
    if (!deletingFitment) return;
    await deleteProductFitment(productId, deletingFitment.id);
    await refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <FitmentRulesEditor
        productId={productId}
        categories={categories}
        vehicleSpecLookups={vehicleSpecLookups}
      />

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <p className="text-xs text-muted-foreground">
          ცალკეული თავსებადობა — მიუთითეთ ტექნიკის კატალოგის კონკრეტული ჩანაწერები,
          რომლებთანაც ეს პროდუქტი თავსებადია (მაგ. ერგება მხოლოდ გარკვეულ მოდელს/წელს).
          არასავალდებულოა.
        </p>

        {loaded && (
          <DataTable
            columns={columns}
            data={fitments}
            getRowKey={(fitment) => fitment.id}
            emptyMessage="თავსებადობა არ არის დამატებული"
            actions={(fitment) => (
              <button
                type="button"
                onClick={() => setDeletingFitment(fitment)}
                className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
              >
                წაშლა
              </button>
            )}
          />
        )}

        <ConfirmDialog
          open={deletingFitment !== null}
          onClose={() => setDeletingFitment(null)}
          title="თავსებადობის წაშლა"
          message={
            <>
              დარწმუნებული ხართ, რომ გსურთ წაშალოთ თავსებადობა{" "}
              <span className="font-semibold text-foreground">
                {deletingFitment ? fitmentLabel(deletingFitment) : ""}
              </span>
              -თან? ამ მოქმედების გაუქმება შეუძლებელია.
            </>
          }
          successMessage="თავსებადობა წაიშალა"
          onConfirm={handleDelete}
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <Select
              options={options}
              value={vehicleCatalogId}
              onChange={setVehicleCatalogId}
              searchable
              placeholder="აირჩიეთ ტექნიკა კატალოგიდან"
              ariaLabel="ტექნიკა კატალოგიდან"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            + დამატება
          </button>
        </div>
      </div>
    </div>
  );
}

export type DraftFitment = { vehicleCatalogId: number };

// Used while creating a brand-new product: fitment links are held locally
// and created right after the product is saved (no productId to attach to
// yet) — mirrors the DraftOptionsEditor/pending-image patterns used
// elsewhere in this same create flow. Fitment rules aren't offered here —
// they need a productId, so they're only addable once the product exists
// (right after saving, in the edit view).
export function DraftFitmentEditor({
  vehicleCatalog,
  fitments,
  onAdd,
  onRemove,
}: {
  vehicleCatalog: VehicleCatalogEntry[];
  fitments: DraftFitment[];
  onAdd: (vehicleCatalogId: number) => void;
  onRemove: (vehicleCatalogId: number) => void;
}) {
  const [vehicleCatalogId, setVehicleCatalogId] = useState("");

  const attachedIds = new Set(fitments.map((fitment) => fitment.vehicleCatalogId));
  const options = useMemo(
    () =>
      vehicleCatalog
        .filter((entry) => !attachedIds.has(entry.id))
        .map((entry) => ({ value: String(entry.id), label: vehicleCatalogLabel(entry) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicleCatalog, fitments],
  );

  const rows = fitments
    .map((fitment) => vehicleCatalog.find((entry) => entry.id === fitment.vehicleCatalogId))
    .filter((entry): entry is VehicleCatalogEntry => entry !== undefined);

  const draftColumns: DataTableColumn<VehicleCatalogEntry>[] = [
    { header: "ტექნიკა", render: (entry) => vehicleCatalogLabel(entry) },
  ];

  function handleAdd() {
    if (!vehicleCatalogId) {
      toast.error("აირჩიეთ ტექნიკა");
      return;
    }
    onAdd(Number(vehicleCatalogId));
    setVehicleCatalogId("");
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        მიუთითეთ ტექნიკის კატალოგის ჩანაწერები, რომლებთანაც ეს პროდუქტი თავსებადია — ისინი
        პროდუქტთან ერთად შეინახება. თავსებადობის წესები (კატეგორია/მახასიათებელი/ყველა
        ტრანსპორტი) დაამატეთ პროდუქტის შენახვის შემდეგ. არასავალდებულოა.
      </p>

      <DataTable
        columns={draftColumns}
        data={rows}
        getRowKey={(entry) => entry.id}
        emptyMessage="თავსებადობა ჯერ არ დამატებულა"
        actions={(entry) => (
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
          >
            წაშლა
          </button>
        )}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <Select
            options={options}
            value={vehicleCatalogId}
            onChange={setVehicleCatalogId}
            searchable
            placeholder="აირჩიეთ ტექნიკა კატალოგიდან"
            ariaLabel="ტექნიკა კატალოგიდან"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          + დამატება
        </button>
      </div>
    </div>
  );
}
