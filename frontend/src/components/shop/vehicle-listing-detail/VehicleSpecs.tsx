"use client";

import { useLocale, useTranslations } from "next-intl";
import { SpecsList, type SpecRow } from "@/components/shared/SpecsList";
import { pickLookupName } from "@/lib/format";
import type { VehicleListing } from "@/lib/api/vehicle-listings";

type Locale = "ka" | "en" | "ru";
export type VehicleSpecRow = SpecRow & { key: string };

// Shared by VehicleSpecs (detail page) and CompareManager (comparison
// table) — a `key` per row lets the comparison table match rows across
// several listings even though which specs exist varies (electric vs.
// combustion, optional fields, ...).
export function buildVehicleSpecRows(
  listing: VehicleListing,
  locale: Locale,
  t: (key: string) => string,
): VehicleSpecRow[] {
  const catalog = listing.vehicleCatalog;
  const isElectric = catalog.powertrainType?.key === "ELECTRIC";

  const rows: VehicleSpecRow[] = [
    { key: "condition", label: t("conditionLabel"), value: pickLookupName(listing.condition, locale) },
    { key: "color", label: t("colorLabel"), value: pickLookupName(listing.color, locale) },
    { key: "year", label: t("yearLabel"), value: String(listing.year) },
  ];

  if (catalog.powertrainType) {
    rows.push({
      key: "powertrainType",
      label: t("powertrainTypeLabel"),
      value: pickLookupName(catalog.powertrainType, locale),
    });
  }

  if (isElectric) {
    if (catalog.motorPowerWatt != null) {
      rows.push({ key: "motorPower", label: t("motorPowerLabel"), value: `${catalog.motorPowerWatt} W` });
    }
    if (catalog.batteryCapacityWh != null) {
      rows.push({
        key: "batteryCapacity",
        label: t("batteryCapacityLabel"),
        value: `${catalog.batteryCapacityWh} Wh`,
      });
    }
    if (catalog.rangeKm != null) {
      rows.push({ key: "range", label: t("rangeLabel"), value: `${catalog.rangeKm} km` });
    }
    if (catalog.chargingTimeMinutes != null) {
      rows.push({
        key: "chargingTime",
        label: t("chargingTimeLabel"),
        value: `${catalog.chargingTimeMinutes} min`,
      });
    }
  } else {
    if (catalog.engineVolumeCc != null) {
      rows.push({ key: "engineVolume", label: t("engineVolumeLabel"), value: `${catalog.engineVolumeCc} cc` });
    }
    if (catalog.enginePowerHp != null) {
      rows.push({ key: "enginePower", label: t("enginePowerLabel"), value: `${catalog.enginePowerHp} hp` });
    }
    if (catalog.cylinderCount != null) {
      rows.push({ key: "cylinderCount", label: t("cylinderCountLabel"), value: String(catalog.cylinderCount) });
    }
    if (catalog.gearCount != null) {
      rows.push({ key: "gearCount", label: t("gearCountLabel"), value: String(catalog.gearCount) });
    }
    if (catalog.fuelType) {
      rows.push({ key: "fuelType", label: t("fuelTypeLabel"), value: pickLookupName(catalog.fuelType, locale) });
    }
    if (catalog.startType) {
      rows.push({ key: "startType", label: t("startTypeLabel"), value: pickLookupName(catalog.startType, locale) });
    }
  }

  if (catalog.seatCount != null) {
    rows.push({ key: "seatCount", label: t("seatCountLabel"), value: String(catalog.seatCount) });
  }
  if (catalog.transmissionType) {
    rows.push({
      key: "transmissionType",
      label: t("transmissionTypeLabel"),
      value: pickLookupName(catalog.transmissionType, locale),
    });
  }
  if (catalog.coolingType) {
    rows.push({ key: "coolingType", label: t("coolingTypeLabel"), value: pickLookupName(catalog.coolingType, locale) });
  }
  if (catalog.finalDriveType) {
    rows.push({
      key: "finalDriveType",
      label: t("finalDriveTypeLabel"),
      value: pickLookupName(catalog.finalDriveType, locale),
    });
  }
  if (catalog.driveType) {
    rows.push({ key: "driveType", label: t("driveTypeLabel"), value: pickLookupName(catalog.driveType, locale) });
  }
  if (catalog.hasLockingDifferential != null) {
    rows.push({
      key: "lockingDifferential",
      label: t("lockingDifferentialLabel"),
      value: catalog.hasLockingDifferential ? t("yes") : t("no"),
    });
  }
  if (catalog.weightKg != null) {
    rows.push({ key: "weight", label: t("weightLabel"), value: `${catalog.weightKg} kg` });
  }
  if (catalog.seatHeightMm != null) {
    rows.push({ key: "seatHeight", label: t("seatHeightLabel"), value: `${catalog.seatHeightMm} mm` });
  }
  if (catalog.fuelTankLiters != null) {
    rows.push({ key: "fuelTank", label: t("fuelTankLabel"), value: `${catalog.fuelTankLiters} L` });
  }
  if (catalog.topSpeedKmh != null) {
    rows.push({ key: "topSpeed", label: t("topSpeedLabel"), value: `${catalog.topSpeedKmh} km/h` });
  }
  if (catalog.hasAbs != null) {
    rows.push({ key: "abs", label: t("absLabel"), value: catalog.hasAbs ? t("yes") : t("no") });
  }

  return rows;
}

export function VehicleSpecs({ listing }: { listing: VehicleListing }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("VehicleListingDetail");
  const rows = buildVehicleSpecRows(listing, locale, t);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("specsHeading")}
      </h2>
      <SpecsList rows={rows} showAllLabel={t("showAllLabel")} collapseLabel={t("collapseLabel")} />
    </div>
  );
}
