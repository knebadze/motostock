"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Loader } from "@/components/shared/Loader";
import { GarageVehicleFormModal } from "./GarageVehicleFormModal";
import { ServiceHistoryModal } from "./ServiceHistoryModal";
import { deleteGarageVehicle, uploadGarageVehicleImage } from "@/lib/api/garage";
import { resolveMediaUrl } from "@/lib/api/client";
import { resolveApiErrorMessage } from "@/lib/api-errors";
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
    className="size-4"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const calendarIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-3.5"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const tagIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-3.5 shrink-0"
  >
    <path d="M20.6 12.6 12.6 20.6a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1 0-2.8L10.8 2.8A2 2 0 0 1 12.2 2H19a2 2 0 0 1 2 2v6.8a2 2 0 0 1-.4 1.8Z" />
    <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const searchIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-3.5"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const historyIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-3.5"
  >
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v4h4" />
    <path d="M12 7v5l3 3" />
  </svg>
);

const trashIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
  >
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    <path d="M10 11v6M14 11v6" />
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
  const tErrors = useTranslations("ApiErrors");
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
      toast.error(resolveApiErrorMessage(error, tErrors, t("photoUploadError")));
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
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {garage.map((vehicle) => {
            const photoUrl = resolveMediaUrl(vehicle.imageUrl);
            const uploading = uploadingId === vehicle.id;
            return (
              <div
                key={vehicle.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
                      {cameraIcon}
                      <span className="text-xs font-medium">{t("addPhoto")}</span>
                    </div>
                  )}

                  <label
                    className={`absolute bottom-2.5 right-2.5 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:text-primary ${
                      uploading ? "pointer-events-none" : "cursor-pointer"
                    }`}
                  >
                    {uploading ? <Loader size="xs" label={tCommon("loader.loading")} /> : cameraIcon}
                    <span className="sr-only">{photoUrl ? t("changePhoto") : t("addPhoto")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(event) => handlePhotoChange(vehicle.id, event)}
                    />
                  </label>
                </div>

                <div className="p-4">
                  <p className="font-semibold text-foreground">
                    {formatVehicleCatalogLabel(vehicle.vehicleCatalog)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {calendarIcon}
                      <span className="sr-only">{t("yearLabel")}: </span>
                      {vehicle.year}
                    </span>
                    {vehicle.vin && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        {tagIcon}
                        <span className="sr-only">{t("vinLabel")}: </span>
                        <span className="truncate font-mono text-xs">{vehicle.vin}</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <Link
                      href={`/compatible-products/${vehicle.vehicleCatalog.id}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {searchIcon}
                      {t("searchButton")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setHistoryTarget(vehicle)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {historyIcon}
                      {t("serviceHistoryButton")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(vehicle)}
                      aria-label={t("delete")}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
                    >
                      {trashIcon}
                    </button>
                  </div>
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
        resolveErrorMessage={(error) =>
          resolveApiErrorMessage(error, tErrors, tCommon("confirmDialog.genericError"))
        }
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
