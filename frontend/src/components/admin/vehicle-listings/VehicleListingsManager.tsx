"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RowActions } from "@/components/shared/RowActions";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import {
  deleteVehicleListing,
  listVehicleListings,
  type VehicleListing,
} from "@/lib/api/vehicle-listings";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import type { LookupItem } from "@/lib/api/lookups";
import { formatPrice } from "@/lib/format";
import { VehicleListingFormModal } from "./VehicleListingFormModal";

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
  { header: "მარკა", render: (listing) => listing.vehicleCatalog.brand.name.ka },
  { header: "მოდელი", render: (listing) => listing.vehicleCatalog.model.name.ka },
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
  initialListings,
  vehicleCatalog,
  conditions,
  statuses,
  colors,
}: {
  initialListings: VehicleListing[];
  vehicleCatalog: VehicleCatalogEntry[];
  conditions: LookupItem[];
  statuses: LookupItem[];
  colors: LookupItem[];
}) {
  const [listings, setListings] = useState(initialListings);
  const [formOpen, setFormOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<VehicleListing | null>(null);
  const [deletingListing, setDeletingListing] = useState<VehicleListing | null>(null);
  const { page, setPage, pageItems, totalPages } = usePagination(listings);

  const canCreate = vehicleCatalog.length > 0;

  async function refresh() {
    try {
      setListings(await listVehicleListings());
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სიის განახლება ვერ მოხერხდა";
      toast.error(message);
    }
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

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={pageItems}
          getRowKey={(listing) => listing.id}
          emptyMessage="განცხადება არ არსებობს"
          actions={(listing) => (
            <RowActions
              onEdit={() => openEditModal(listing)}
              onDelete={() => setDeletingListing(listing)}
            />
          )}
        />
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
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

      <ConfirmDialog
        open={deletingListing !== null}
        onClose={() => setDeletingListing(null)}
        title="განცხადების წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">
              {deletingListing?.vehicleCatalog.brand.name.ka}{" "}
              {deletingListing?.vehicleCatalog.model.name.ka}
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
