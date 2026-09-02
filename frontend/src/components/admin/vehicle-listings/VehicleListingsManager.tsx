"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { AdminFilterPanel } from "@/components/admin/shared/AdminFilterPanel";
import {
  deleteVehicleListing,
  listVehicleListingsPage,
  type VehicleListing,
} from "@/lib/api/vehicle-listings";
import type { AdminListPage } from "@/lib/api/server";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import type { AdminFilterEntry } from "@/lib/api/admin-filters";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import type { LookupItem } from "@/lib/api/lookups";
import { formatPrice } from "@/lib/format";
import { buildVehicleListingFilterFields } from "@/config/admin-filters/vehicle-listing-filters";
import { VehicleListingFormModal } from "./VehicleListingFormModal";
import { VehicleListingDetailModal } from "./VehicleListingDetailModal";

const columns: DataTableColumn<VehicleListing>[] = [
  {
    header: "",
    render: (listing) => {
      const imageUrl = listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl;
      return resolveMediaUrl(imageUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveMediaUrl(imageUrl) ?? undefined}
          alt=""
          className="size-10 rounded-lg border border-border object-cover"
        />
      ) : (
        <div className="size-10 rounded-lg border border-dashed border-border" />
      );
    },
  },
  { header: "მარკა", render: (listing) => listing.vehicleCatalog.brand.name },
  { header: "მოდელი", render: (listing) => listing.vehicleCatalog.model.name },
  { header: "წელი", render: (listing) => listing.year, cellClassName: "text-muted-foreground" },
  {
    header: "მდგომარეობა",
    render: (listing) => listing.condition.nameKa,
    cellClassName: "text-muted-foreground",
  },
  {
    header: "ფერი",
    render: (listing) => listing.color.nameKa,
    cellClassName: "text-muted-foreground",
  },
  {
    header: "ფასი",
    render: (listing) =>
      listing.activeDiscount ? (
        <span className="flex flex-col">
          <span className="text-xs text-muted-foreground line-through">
            {formatPrice(listing.price)}
          </span>
          <span className="font-semibold text-primary">
            {formatPrice(listing.activeDiscount.discountPrice)}
          </span>
        </span>
      ) : (
        formatPrice(listing.price)
      ),
  },
  {
    header: "მარაგში",
    render: (listing) => listing.stockQuantity,
    cellClassName: "text-muted-foreground",
  },
  {
    header: "სტატუსი",
    render: (listing) => listing.status.nameKa,
    cellClassName: "text-muted-foreground",
  },
  {
    header: "აქტიური",
    render: (listing) => (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          listing.isActive
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {listing.isActive ? "აქტიური" : "გამორთული"}
      </span>
    ),
  },
];

export function VehicleListingsManager({
  initialData,
  vehicleCatalog,
  conditions,
  statuses,
  colors,
}: {
  initialData: AdminListPage<VehicleListing>;
  vehicleCatalog: VehicleCatalogEntry[];
  conditions: LookupItem[];
  statuses: LookupItem[];
  colors: LookupItem[];
}) {
  const [data, setData] = useState(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<VehicleListing | null>(null);
  const [deletingListing, setDeletingListing] = useState<VehicleListing | null>(null);
  const [viewingListingId, setViewingListingId] = useState<number | null>(null);
  const [adminFilters, setAdminFilters] = useState<AdminFilterEntry[]>([]);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const canCreate = vehicleCatalog.length > 0;

  const filterFields = buildVehicleListingFilterFields({ vehicleCatalog, conditions, statuses, colors });

  async function loadPage(page: number, filters: AdminFilterEntry[] = adminFilters) {
    try {
      setData(await listVehicleListingsPage({ adminFilters: filters, page, pageSize: data.pageSize }));
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  // AdminFilterPanel only calls this once, on "გაფილტვრა" — one click, one
  // request, never on every keystroke.
  async function handleFilterApply(filters: AdminFilterEntry[]) {
    setAdminFilters(filters);
    await loadPage(1, filters);
  }

  // VehicleListingFormModal's onSaved just needs a no-arg refresh of the
  // current page — same current filters, same page number.
  function refresh() {
    return loadPage(data.page);
  }

  function openCreateModal() {
    setEditingListing(null);
    setFormOpen(true);
  }

  function openEditModal(listing: VehicleListing) {
    setEditingListing(listing);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">გასაყიდი ტექნიკა</h1>
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!canCreate}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          + განცხადების დამატება
        </button>
      </div>

      {!canCreate && (
        <p className="mt-2 text-sm text-muted-foreground">
          განცხადების დასამატებლად ჯერ საჭიროა ტექნიკის კატალოგში ჩანაწერის არსებობა.
        </p>
      )}

      <div className="mt-4">
        <AdminFilterPanel fields={filterFields} onChange={handleFilterApply} />
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(listing) => listing.id}
          emptyMessage="განცხადება არ არსებობს"
          actions={(listing) => (
            <RowActions
              onView={() => setViewingListingId(listing.id)}
              onEdit={() => openEditModal(listing)}
              onDelete={() => setDeletingListing(listing)}
            />
          )}
        />
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={(page) => loadPage(page)} />
      </div>

      <VehicleListingFormModal
        key={`${editingListing?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        vehicleCatalog={vehicleCatalog}
        conditions={conditions}
        statuses={statuses}
        colors={colors}
        listing={editingListing}
      />

      {viewingListingId != null && (
        <VehicleListingDetailModal
          listingId={viewingListingId}
          onClose={() => setViewingListingId(null)}
        />
      )}

      <ConfirmDialog
        open={deletingListing !== null}
        onClose={() => setDeletingListing(null)}
        title="განცხადების წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">
              {deletingListing?.vehicleCatalog.brand.name}{" "}
              {deletingListing?.vehicleCatalog.model.name}
            </span>
            ? ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="განცხადება წაიშალა"
        onConfirm={async () => {
          if (!deletingListing) return;
          await deleteVehicleListing(deletingListing.id);
          await refresh();
        }}
      />
    </div>
  );
}
