"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { GarageVehicleFormModal } from "./GarageVehicleFormModal";
import { ServiceHistoryModal } from "./ServiceHistoryModal";
import { deleteGarageVehicle, uploadGarageVehicleImage } from "@/lib/api/garage";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import type { GarageVehicle, VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import type { Model } from "@/lib/api/models";
import type { LookupItem } from "@/lib/api/lookups";
import { formatVehicleCatalogLabel } from "@/lib/format";

const cameraIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export function GarageManager({
  initialGarage,
  vehicleCatalog,
  models,
  fuelTypes,
  transmissionTypes,
  vinDecodeEnabled,
}: {
  initialGarage: GarageVehicle[];
  vehicleCatalog: VehicleCatalogEntry[];
  models: Model[];
  fuelTypes: LookupItem[];
  transmissionTypes: LookupItem[];
  vinDecodeEnabled: boolean;
}) {
  const t = useTranslations("Account.garage");
  const tCommon = useTranslations("Common");
  const [garage, setGarage] = useState(initialGarage);
  const [catalog, setCatalog] = useState(vehicleCatalog);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GarageVehicle | null>(null);
  const [historyTarget, setHistoryTarget] = useState<GarageVehicle | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteGarageVehicle(deleteTarget.id);
    setGarage((current) => current.filter((item) => item.id !== deleteTarget.id));
  }

  async function handlePhotoChange(vehicleId: number, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingId(vehicleId);
    try {
      const updated = await uploadGarageVehicleImage(vehicleId, file);
      setGarage((current) => current.map((item) => (item.id === vehicleId ? updated : item)));
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : t("photoUploadError");
      toast.error(message);
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground">{t("description")}</p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          {t("addButton")}
        </button>
      </div>

      {garage.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {garage.map((vehicle) => {
            const photoUrl = resolveMediaUrl(vehicle.imageUrl);
            const uploading = uploadingId === vehicle.id;
            return (
              <div key={vehicle.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                    {photoUrl ? (
                      <Image src={photoUrl} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        {cameraIcon}
                      </div>
                    )}
                  </div>
                  <label
                    className={`text-sm font-medium text-primary hover:underline ${
                      uploading ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }`}
                  >
                    {uploading ? tCommon("loader.loading") : photoUrl ? t("changePhoto") : t("addPhoto")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(event) => handlePhotoChange(vehicle.id, event)}
                    />
                  </label>
                </div>

                <p className="font-semibold">{formatVehicleCatalogLabel(vehicle.vehicleCatalog)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("yearLabel")}: {vehicle.year}
                </p>
                {vehicle.vin && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("vinLabel")}: {vehicle.vin}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/compatible-products/${vehicle.vehicleCatalog.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t("searchButton")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setHistoryTarget(vehicle)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t("serviceHistoryButton")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(vehicle)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    {t("delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GarageVehicleFormModal
        key={String(modalOpen)}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        vehicleCatalog={catalog}
        models={models}
        fuelTypes={fuelTypes}
        transmissionTypes={transmissionTypes}
        vinDecodeEnabled={vinDecodeEnabled}
        onSaved={(vehicle) => {
          setGarage((current) => [vehicle, ...current]);
          setCatalog((current) =>
            current.some((entry) => entry.id === vehicle.vehicleCatalog.id)
              ? current
              : [vehicle.vehicleCatalog, ...current],
          );
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("deleteConfirmTitle")}
        message={t("deleteConfirmMessage")}
        confirmLabel={t("delete")}
        successMessage={t("deleteSuccess")}
        onConfirm={handleDelete}
        cancelLabel={tCommon("confirmDialog.cancel")}
        processingLabel={tCommon("confirmDialog.processing")}
        errorFallback={tCommon("confirmDialog.genericError")}
        closeLabel={tCommon("modal.close")}
        loaderLabel={tCommon("loader.loading")}
      />

      {historyTarget && (
        <ServiceHistoryModal
          garageVehicleId={historyTarget.id}
          vehicleLabel={formatVehicleCatalogLabel(historyTarget.vehicleCatalog)}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}
