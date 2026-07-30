"use client";

import { useLocale, useTranslations } from "next-intl";
import { pickLookupName } from "@/lib/format";
import type { VehicleListing } from "@/lib/api/vehicle-listings";

type Locale = "ka" | "en" | "ru";
type SpecRow = { label: string; value: string };

export function VehicleSpecs({ listing }: { listing: VehicleListing }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("VehicleListingDetail");
  const catalog = listing.vehicleCatalog;
  const isElectric = catalog.powertrainType?.key === "ELECTRIC";

  const rows: SpecRow[] = [
    { label: t("conditionLabel"), value: pickLookupName(listing.condition, locale) },
    { label: t("colorLabel"), value: pickLookupName(listing.color, locale) },
    { label: t("yearLabel"), value: String(listing.year) },
  ];

  if (catalog.powertrainType) {
    rows.push({ label: t("powertrainTypeLabel"), value: pickLookupName(catalog.powertrainType, locale) });
  }

  if (isElectric) {
    if (catalog.motorPowerWatt != null) {
      rows.push({ label: t("motorPowerLabel"), value: `${catalog.motorPowerWatt} W` });
    }
    if (catalog.batteryCapacityWh != null) {
      rows.push({ label: t("batteryCapacityLabel"), value: `${catalog.batteryCapacityWh} Wh` });
    }
    if (catalog.rangeKm != null) {
      rows.push({ label: t("rangeLabel"), value: `${catalog.rangeKm} km` });
    }
    if (catalog.chargingTimeMinutes != null) {
      rows.push({ label: t("chargingTimeLabel"), value: `${catalog.chargingTimeMinutes} min` });
    }
  } else {
    if (catalog.engineVolumeCc != null) {
      rows.push({ label: t("engineVolumeLabel"), value: `${catalog.engineVolumeCc} cc` });
    }
    if (catalog.enginePowerHp != null) {
      rows.push({ label: t("enginePowerLabel"), value: `${catalog.enginePowerHp} hp` });
    }
    if (catalog.cylinderCount != null) {
      rows.push({ label: t("cylinderCountLabel"), value: String(catalog.cylinderCount) });
    }
    if (catalog.gearCount != null) {
      rows.push({ label: t("gearCountLabel"), value: String(catalog.gearCount) });
    }
    if (catalog.fuelType) {
      rows.push({ label: t("fuelTypeLabel"), value: pickLookupName(catalog.fuelType, locale) });
    }
    if (catalog.startType) {
      rows.push({ label: t("startTypeLabel"), value: pickLookupName(catalog.startType, locale) });
    }
  }

  if (catalog.seatCount != null) {
    rows.push({ label: t("seatCountLabel"), value: String(catalog.seatCount) });
  }
  if (catalog.transmissionType) {
    rows.push({ label: t("transmissionTypeLabel"), value: pickLookupName(catalog.transmissionType, locale) });
  }
  if (catalog.coolingType) {
    rows.push({ label: t("coolingTypeLabel"), value: pickLookupName(catalog.coolingType, locale) });
  }
  if (catalog.finalDriveType) {
    rows.push({ label: t("finalDriveTypeLabel"), value: pickLookupName(catalog.finalDriveType, locale) });
  }
  if (catalog.driveType) {
    rows.push({ label: t("driveTypeLabel"), value: pickLookupName(catalog.driveType, locale) });
  }
  if (catalog.hasLockingDifferential != null) {
    rows.push({
      label: t("lockingDifferentialLabel"),
      value: catalog.hasLockingDifferential ? t("yes") : t("no"),
    });
  }
  if (catalog.weightKg != null) {
    rows.push({ label: t("weightLabel"), value: `${catalog.weightKg} kg` });
  }
  if (catalog.seatHeightMm != null) {
    rows.push({ label: t("seatHeightLabel"), value: `${catalog.seatHeightMm} mm` });
  }
  if (catalog.fuelTankLiters != null) {
    rows.push({ label: t("fuelTankLabel"), value: `${catalog.fuelTankLiters} L` });
  }
  if (catalog.topSpeedKmh != null) {
    rows.push({ label: t("topSpeedLabel"), value: `${catalog.topSpeedKmh} km/h` });
  }
  if (catalog.hasAbs != null) {
    rows.push({ label: t("absLabel"), value: catalog.hasAbs ? t("yes") : t("no") });
  }

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("specsHeading")}
      </h2>
      <dl className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 border-b border-border py-1.5 text-sm"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
