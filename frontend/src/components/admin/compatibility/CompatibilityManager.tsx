"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import { Select } from "@/components/shared/Select";
import { Tabs } from "@/components/shared/Tabs";
import { formatPrice, formatVehicleCatalogLabel } from "@/lib/format";
import { ApiRequestError } from "@/lib/api/client";
import {
  listCompatibility,
  getCompatibleVehiclesForProduct,
  type CompatibilityItem,
  type CompatibleVehicle,
  type ListCompatibilityFilters,
} from "@/lib/api/compatibility";
import { listProducts, type Product } from "@/lib/api/products";
import type { Category } from "@/lib/api/categories";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";

const KIND_LABELS: Record<CompatibilityItem["kind"], string> = {
  FITMENT: "ცალკეული ტრანსპორტი",
  RULE_ALL: "ყველა ტრანსპორტი",
  RULE_CATEGORY: "კატეგორია",
  RULE_SPEC: "მახასიათებელი",
};

const KIND_BADGE_CLASSES: Record<CompatibilityItem["kind"], string> = {
  FITMENT: "bg-primary/15 text-primary",
  RULE_ALL: "bg-green-500/15 text-green-600",
  RULE_CATEGORY: "bg-blue-500/15 text-blue-600",
  RULE_SPEC: "bg-amber-500/15 text-amber-600",
};

function productLabel(product: Product): string {
  return `${product.name.ka} — ${product.category.name.ka}`;
}

function targetLabel(item: CompatibilityItem): string {
  if (item.kind === "FITMENT" && item.vehicle) {
    return formatVehicleCatalogLabel(item.vehicle);
  }
  if (item.kind === "RULE_ALL") return "ყველა ტრანსპორტი";
  if (item.kind === "RULE_CATEGORY" && item.category) return item.category.name.ka;
  if (item.kind === "RULE_SPEC" && item.specFieldLabel && item.specValue) {
    return `${item.specFieldLabel.ka}: ${item.specValue.nameKa}`;
  }
  return "—";
}

const columns: DataTableColumn<CompatibilityItem>[] = [
  {
    header: "პროდუქტი",
    render: (item) => (
      <div>
        <p>{item.product.name.ka}</p>
        <p className="text-xs text-muted-foreground">{item.product.category.name.ka}</p>
      </div>
    ),
  },
  {
    header: "ტიპი",
    render: (item) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_BADGE_CLASSES[item.kind]}`}>
        {KIND_LABELS[item.kind]}
      </span>
    ),
  },
  { header: "სამიზნე", render: (item) => targetLabel(item) },
];

function AllCompatibilityTab({
  initialItems,
  categories,
}: {
  initialItems: CompatibilityItem[];
  categories: Category[];
}) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [kind, setKind] = useState("");
  const { page, setPage, pageItems, totalPages } = usePagination(items);

  const categoryOptions = categories.map((category) => ({
    value: String(category.id),
    label: category.name.ka,
  }));
  const kindOptions = [
    { value: "FITMENT", label: "ცალკეული ტრანსპორტი" },
    { value: "RULE", label: "წესები" },
  ];
  const hasActiveFilters = search.trim() !== "" || categoryId !== "" || kind !== "";

  async function fetchItems(filters: ListCompatibilityFilters) {
    setLoading(true);
    try {
      setItems(await listCompatibility(filters));
      setPage(1);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "სიის ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  function handleApplyFilters() {
    fetchItems({
      search: search.trim() || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      kind: kind === "FITMENT" || kind === "RULE" ? kind : undefined,
    });
  }

  function handleClearFilters() {
    setSearch("");
    setCategoryId("");
    setKind("");
    fetchItems({});
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">ძებნა</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="პროდუქტის სახელი"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label htmlFor="compatibility-category" className="text-xs font-medium text-muted-foreground">
            კატეგორია
          </label>
          <Select
            id="compatibility-category"
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            searchable
            placeholder="ყველა"
          />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label htmlFor="compatibility-kind" className="text-xs font-medium text-muted-foreground">
            ტიპი
          </label>
          <Select id="compatibility-kind" options={kindOptions} value={kind} onChange={setKind} placeholder="ყველა" />
        </div>
        <button
          type="button"
          onClick={handleApplyFilters}
          disabled={loading}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          გაფილტვრა
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={loading}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
          >
            გაწმენდა
          </button>
        )}
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={pageItems}
          getRowKey={(item) => item.id}
          emptyMessage="თავსებადობა არ მოიძებნა"
          actions={(item) => (
            <div className="flex justify-end">
              <Link
                href={`/admin/products/${item.product.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                ნახვა
              </Link>
            </div>
          )}
        />
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

function CompatibilityCheckTab({
  products,
  vehicleCatalog,
}: {
  products: Product[];
  vehicleCatalog: VehicleCatalogEntry[];
}) {
  const [mode, setMode] = useState<"vehicle" | "product">("vehicle");
  const [vehicleCatalogId, setVehicleCatalogId] = useState("");
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchedProducts, setMatchedProducts] = useState<Product[] | null>(null);
  const [matchedVehicles, setMatchedVehicles] = useState<CompatibleVehicle[] | null>(null);

  const vehicleOptions = vehicleCatalog.map((entry) => ({
    value: String(entry.id),
    label: formatVehicleCatalogLabel(entry),
  }));
  const productOptions = products.map((product) => ({
    value: String(product.id),
    label: productLabel(product),
  }));

  async function handleVehicleChange(value: string) {
    setVehicleCatalogId(value);
    setMatchedProducts(null);
    if (!value) return;

    setLoading(true);
    try {
      setMatchedProducts(await listProducts({ vehicleCatalogId: Number(value) }));
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  async function handleProductChange(value: string) {
    setProductId(value);
    setMatchedVehicles(null);
    if (!value) return;

    setLoading(true);
    try {
      setMatchedVehicles(await getCompatibleVehiclesForProduct(Number(value)));
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  function handleModeChange(next: "vehicle" | "product") {
    setMode(next);
    setVehicleCatalogId("");
    setProductId("");
    setMatchedProducts(null);
    setMatchedVehicles(null);
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeChange("vehicle")}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            mode === "vehicle"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-foreground hover:border-primary hover:text-primary"
          }`}
        >
          ტრანსპორტით
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("product")}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            mode === "product"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-foreground hover:border-primary hover:text-primary"
          }`}
        >
          პროდუქტით
        </button>
      </div>

      <div className="mt-4 max-w-md">
        {mode === "vehicle" ? (
          <Select
            options={vehicleOptions}
            value={vehicleCatalogId}
            onChange={handleVehicleChange}
            searchable
            placeholder="აირჩიეთ ტრანსპორტი"
            ariaLabel="ტრანსპორტი"
          />
        ) : (
          <Select
            options={productOptions}
            value={productId}
            onChange={handleProductChange}
            searchable
            placeholder="აირჩიეთ პროდუქტი"
            ariaLabel="პროდუქტი"
          />
        )}
      </div>

      <div className="mt-6">
        {loading && <p className="text-sm text-muted-foreground">იტვირთება...</p>}

        {!loading && mode === "vehicle" && matchedProducts && (
          <DataTable
            columns={[
              { header: "პროდუქტი", render: (product: Product) => product.name.ka },
              {
                header: "კატეგორია",
                render: (product: Product) => product.category.name.ka,
                cellClassName: "text-muted-foreground",
              },
              {
                header: "ფასი",
                render: (product: Product) => (product.minPrice != null ? formatPrice(product.minPrice) : "—"),
              },
            ]}
            data={matchedProducts}
            getRowKey={(product) => product.id}
            emptyMessage="თავსებადი პროდუქტი არ მოიძებნა"
          />
        )}

        {!loading && mode === "product" && matchedVehicles && (
          <DataTable
            columns={[
              {
                header: "ტრანსპორტი",
                render: (vehicle: CompatibleVehicle) => formatVehicleCatalogLabel(vehicle),
              },
            ]}
            data={matchedVehicles}
            getRowKey={(vehicle) => vehicle.id}
            emptyMessage="თავსებადი ტრანსპორტი არ მოიძებნა"
          />
        )}
      </div>
    </div>
  );
}

export function CompatibilityManager({
  initialItems,
  categories,
  products,
  vehicleCatalog,
}: {
  initialItems: CompatibilityItem[];
  categories: Category[];
  products: Product[];
  vehicleCatalog: VehicleCatalogEntry[];
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">თავსებადობა</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ყველა პროდუქტის ტრანსპორტთან თავსებადობის ერთიანი მიმოხილვა.
      </p>

      <div className="mt-6">
        <Tabs
          tabs={[
            {
              key: "all",
              label: "ყველა კავშირი",
              content: <AllCompatibilityTab initialItems={initialItems} categories={categories} />,
            },
            {
              key: "check",
              label: "თავსებადობის შემოწმება",
              content: <CompatibilityCheckTab products={products} vehicleCatalog={vehicleCatalog} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
