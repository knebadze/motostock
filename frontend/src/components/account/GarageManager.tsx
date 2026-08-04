"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { GarageVehicleFormModal } from "./GarageVehicleFormModal";
import { deleteGarageVehicle } from "@/lib/api/garage";
import type { GarageVehicle, VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import type { Model } from "@/lib/api/models";
import type { LookupItem } from "@/lib/api/lookups";
import { formatVehicleCatalogLabel } from "@/lib/format";

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
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Account.garage");
  const [garage, setGarage] = useState(initialGarage);
  const [catalog, setCatalog] = useState(vehicleCatalog);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GarageVehicle | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteGarageVehicle(deleteTarget.id);
    setGarage((current) => current.filter((item) => item.id !== deleteTarget.id));
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
          {garage.map((vehicle) => (
            <div key={vehicle.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-semibold">{formatVehicleCatalogLabel(vehicle.vehicleCatalog, locale)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("yearLabel")}: {vehicle.year}
              </p>
              {vehicle.vin && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("vinLabel")}: {vehicle.vin}
                </p>
              )}
              <div className="mt-3 flex gap-3">
                <Link
                  href={`/compatible-products/${vehicle.vehicleCatalog.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("searchButton")}
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(vehicle)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          ))}
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
      />
    </div>
  );
}
