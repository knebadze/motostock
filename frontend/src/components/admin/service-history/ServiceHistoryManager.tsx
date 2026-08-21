"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Loader } from "@/components/shared/Loader";
import { getUser, listUsers, type AdminUser } from "@/lib/api/users";
import type { GarageVehicle } from "@/lib/api/garage";
import {
  deleteServiceRecord,
  listServiceRecordsForVehicle,
  type ServiceRecord,
} from "@/lib/api/service-records";
import type { ServiceType } from "@/lib/api/service-types";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { formatDate, formatVehicleCatalogLabel } from "@/lib/format";
import { ServiceRecordFormModal } from "./ServiceRecordFormModal";

const SEARCH_DEBOUNCE_MS = 350;

const cameraIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const POSITION_LABELS: Record<string, string> = {
  FRONT: "წინა",
  REAR: "უკანა",
  BOTH: "ორივე",
};

function serviceRecordName(record: ServiceRecord): string {
  return record.serviceTypeName?.ka ?? record.customServiceName ?? "";
}

function serviceRecordDetail(record: ServiceRecord): string | null {
  const parts: string[] = [];
  if (record.position) parts.push(POSITION_LABELS[record.position]);
  if (record.filterChanged) parts.push("ფილტრიც შეიცვალა");
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ServiceHistoryManager({ initialServiceTypes }: { initialServiceTypes: ServiceType[] }) {
  const [serviceTypes] = useState(initialServiceTypes);

  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [garageVehicles, setGarageVehicles] = useState<GarageVehicle[]>([]);
  const [loadingGarage, setLoadingGarage] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<GarageVehicle | null>(null);

  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<ServiceRecord | null>(null);

  useEffect(() => {
    const query = userQuery.trim();
    if (!query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserResults([]);
      return;
    }

    setSearchingUsers(true);
    const timeoutId = setTimeout(() => {
      listUsers(query)
        .then(setUserResults)
        .catch(() => setUserResults([]))
        .finally(() => setSearchingUsers(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [userQuery]);

  function selectUser(user: AdminUser) {
    setSelectedUser(user);
    setUserQuery("");
    setUserResults([]);
    setSelectedVehicle(null);
    setRecords([]);
    setLoadingGarage(true);
    getUser(user.id)
      .then((detail) => setGarageVehicles(detail.garage))
      .catch((error) => {
        const message =
          error instanceof ApiRequestError ? error.message : "გარაჟის ჩატვირთვა ვერ მოხერხდა";
        toast.error(message);
      })
      .finally(() => setLoadingGarage(false));
  }

  function changeUser() {
    setSelectedUser(null);
    setGarageVehicles([]);
    setSelectedVehicle(null);
    setRecords([]);
  }

  function selectVehicle(vehicle: GarageVehicle) {
    setSelectedVehicle(vehicle);
    refreshRecords(vehicle.id);
  }

  function refreshRecords(garageVehicleId: number) {
    setLoadingRecords(true);
    listServiceRecordsForVehicle(garageVehicleId)
      .then(setRecords)
      .catch((error) => {
        const message =
          error instanceof ApiRequestError ? error.message : "ისტორიის ჩატვირთვა ვერ მოხერხდა";
        toast.error(message);
      })
      .finally(() => setLoadingRecords(false));
  }

  function openCreateModal() {
    setEditingRecord(null);
    setFormOpen(true);
  }

  function openEditModal(record: ServiceRecord) {
    setEditingRecord(record);
    setFormOpen(true);
  }

  const columns: DataTableColumn<ServiceRecord>[] = [
    { header: "თარიღი", render: (record) => formatDate(record.performedAt) },
    { header: "სერვისი", render: (record) => serviceRecordName(record) },
    { header: "კილომეტრაჟი", render: (record) => `${record.mileageKm} კმ` },
    {
      header: "დეტალი",
      render: (record) => serviceRecordDetail(record) ?? "—",
      cellClassName: "text-muted-foreground",
    },
    {
      header: "შენიშვნა",
      render: (record) => record.notes ?? "—",
      cellClassName: "text-muted-foreground",
    },
  ];

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">სერვისის ისტორია</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          მოძებნეთ მომხმარებელი, აირჩიეთ მისი ტრანსპორტი გარაჟიდან და ჩაწერეთ სახელოსნოში ჩატარებული
          სერვისი.
        </p>
      </div>

      {!selectedUser ? (
        <div className="mt-6 max-w-md">
          <label htmlFor="service-history-user-search" className="text-sm font-medium">
            მომხმარებლის ძებნა
          </label>
          <input
            id="service-history-user-search"
            value={userQuery}
            onChange={(event) => setUserQuery(event.target.value)}
            placeholder="სახელი, გვარი ან ემეილი"
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />

          {searchingUsers && (
            <div className="mt-3 flex justify-center">
              <Loader size="sm" />
            </div>
          )}

          {!searchingUsers && userResults.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {userResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectUser(user)}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm transition-colors hover:border-primary"
                >
                  <p className="font-semibold text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </button>
              ))}
            </div>
          )}

          {!searchingUsers && userQuery.trim() && userResults.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">მომხმარებელი ვერ მოიძებნა</p>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <p className="font-semibold text-foreground">{selectedUser.name}</p>
              <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
            </div>
            <button
              type="button"
              onClick={changeUser}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              მომხმარებლის შეცვლა
            </button>
          </div>

          {loadingGarage ? (
            <div className="mt-6 flex justify-center">
              <Loader size="lg" />
            </div>
          ) : garageVehicles.length === 0 ? (
            <p className="mt-6 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              ამ მომხმარებლის გარაჟი ცარიელია
            </p>
          ) : (
            <div className="mt-6">
              <h2 className="text-sm font-semibold">ტრანსპორტი</h2>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {garageVehicles.map((vehicle) => {
                  const photoUrl = resolveMediaUrl(vehicle.imageUrl);
                  return (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => selectVehicle(vehicle)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                        selectedVehicle?.id === vehicle.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary"
                      }`}
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                        {photoUrl ? (
                          <Image src={photoUrl} alt="" fill sizes="56px" className="object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            {cameraIcon}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {formatVehicleCatalogLabel(vehicle.vehicleCatalog)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">წელი: {vehicle.year}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedVehicle && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  სერვისის ისტორია — {formatVehicleCatalogLabel(selectedVehicle.vehicleCatalog)}
                </h2>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  + სერვისის დამატება
                </button>
              </div>

              <div className="mt-3">
                {loadingRecords ? (
                  <div className="flex justify-center py-10">
                    <Loader size="lg" />
                  </div>
                ) : (
                  <DataTable
                    columns={columns}
                    data={records}
                    getRowKey={(record) => record.id}
                    emptyMessage="ჩანაწერი ჯერ არ დამატებულა"
                    actions={(record) => (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(record)}
                          className="rounded-full px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                          რედაქტირება
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRecord(record)}
                          className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
                        >
                          წაშლა
                        </button>
                      </div>
                    )}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedVehicle && (
        <ServiceRecordFormModal
          key={`${editingRecord?.id ?? "new"}-${formOpen}`}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={() => refreshRecords(selectedVehicle.id)}
          garageVehicleId={selectedVehicle.id}
          serviceTypes={serviceTypes}
          record={editingRecord}
        />
      )}

      <ConfirmDialog
        open={deletingRecord !== null}
        onClose={() => setDeletingRecord(null)}
        title="ჩანაწერის წაშლა"
        message={
          <>
            დარწმუნებული ხართ, რომ გსურთ წაშალოთ{" "}
            <span className="font-semibold text-foreground">
              {deletingRecord ? serviceRecordName(deletingRecord) : ""}
            </span>
            ? ამ მოქმედების გაუქმება შეუძლებელია.
          </>
        }
        successMessage="ჩანაწერი წაიშალა"
        onConfirm={async () => {
          if (!deletingRecord || !selectedVehicle) return;
          await deleteServiceRecord(deletingRecord.id);
          refreshRecords(selectedVehicle.id);
        }}
      />
    </div>
  );
}
