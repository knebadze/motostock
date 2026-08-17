"use client";

import { useLocale, useTranslations } from "next-intl";
import { SpecsList, type SpecRow } from "@/components/shared/SpecsList";
import { pickLookupName } from "@/lib/format";
import type { VehicleListing } from "@/lib/api/vehicle-listings";

type Locale = "ka" | "en" | "ru";
// `raw` is the plain numeric value behind a formatted row (booleans as
// 1/0), or null for rows with no meaningful ordering (text/lookup values) —
// CompareManager uses it to work out which column is highest/lowest without
// re-parsing the formatted string.
export type VehicleSpecRow = SpecRow & { key: string; raw: number | null };

// Shared by VehicleSpecs (detail page) and CompareManager (comparison
// table) — a `key` per row lets the comparison table match rows across
// several listings even though which specs exist varies (electric vs.
// combustion, optional fields, ...).
export function buildVehicleSpecRows(
  listing: VehicleListing,
  locale: Locale,
  t: (key: string, values?: Record<string, string | number>) => string,
): VehicleSpecRow[] {
  const catalog = listing.vehicleCatalog;
  const isElectric = catalog.powertrainType?.key === "ELECTRIC";

  const rows: VehicleSpecRow[] = [
    { key: "condition", label: t("conditionLabel"), value: pickLookupName(listing.condition, locale), raw: null },
    { key: "color", label: t("colorLabel"), value: pickLookupName(listing.color, locale), raw: null },
    { key: "year", label: t("yearLabel"), value: String(listing.year), raw: listing.year },
  ];

  if (listing.mileageKm != null) {
    rows.push({
      key: "mileage",
      label: t("mileageLabel"),
      value: `${listing.mileageKm} km`,
      raw: listing.mileageKm,
    });
  }

  if (listing.warrantyValue != null && listing.warrantyUnit != null) {
    rows.push({
      key: "warranty",
      label: t("warrantyLabel"),
      value: t(listing.warrantyUnit === "YEAR" ? "warrantyYearsValue" : "warrantyMonthsValue", {
        value: listing.warrantyValue,
      }),
      raw: listing.warrantyValue,
    });
  }

  if (catalog.powertrainType) {
    rows.push({
      key: "powertrainType",
      label: t("powertrainTypeLabel"),
      value: pickLookupName(catalog.powertrainType, locale),
      raw: null,
    });
  }

  if (isElectric) {
    if (catalog.motorPowerWatt != null) {
      rows.push({
        key: "motorPower",
        label: t("motorPowerLabel"),
        value: `${catalog.motorPowerWatt} W`,
        raw: catalog.motorPowerWatt,
      });
    }
    if (catalog.batteryCapacityWh != null) {
      rows.push({
        key: "batteryCapacity",
        label: t("batteryCapacityLabel"),
        value: `${catalog.batteryCapacityWh} Wh`,
        raw: catalog.batteryCapacityWh,
      });
    }
    if (catalog.rangeKm != null) {
      rows.push({ key: "range", label: t("rangeLabel"), value: `${catalog.rangeKm} km`, raw: catalog.rangeKm });
    }
    if (catalog.chargingTimeMinutes != null) {
      rows.push({
        key: "chargingTime",
        label: t("chargingTimeLabel"),
        value: `${catalog.chargingTimeMinutes} min`,
        raw: catalog.chargingTimeMinutes,
      });
    }
  } else {
    if (catalog.engineVolumeCc != null) {
      rows.push({
        key: "engineVolume",
        label: t("engineVolumeLabel"),
        value: `${catalog.engineVolumeCc} cc`,
        raw: catalog.engineVolumeCc,
      });
    }
    if (catalog.enginePowerHp != null) {
      rows.push({
        key: "enginePower",
        label: t("enginePowerLabel"),
        value: `${catalog.enginePowerHp} hp`,
        raw: catalog.enginePowerHp,
      });
    }
    if (catalog.cylinderCount != null) {
      rows.push({
        key: "cylinderCount",
        label: t("cylinderCountLabel"),
        value: String(catalog.cylinderCount),
        raw: catalog.cylinderCount,
      });
    }
    if (catalog.gearCount != null) {
      rows.push({
        key: "gearCount",
        label: t("gearCountLabel"),
        value: String(catalog.gearCount),
        raw: catalog.gearCount,
      });
    }
    if (catalog.fuelType) {
      rows.push({
        key: "fuelType",
        label: t("fuelTypeLabel"),
        value: pickLookupName(catalog.fuelType, locale),
        raw: null,
      });
    }
    if (catalog.startType) {
      rows.push({
        key: "startType",
        label: t("startTypeLabel"),
        value: pickLookupName(catalog.startType, locale),
        raw: null,
      });
    }
  }

  if (catalog.seatCount != null) {
    rows.push({
      key: "seatCount",
      label: t("seatCountLabel"),
      value: String(catalog.seatCount),
      raw: catalog.seatCount,
    });
  }
  if (catalog.transmissionType) {
    rows.push({
      key: "transmissionType",
      label: t("transmissionTypeLabel"),
      value: pickLookupName(catalog.transmissionType, locale),
      raw: null,
    });
  }
  if (catalog.coolingType) {
    rows.push({
      key: "coolingType",
      label: t("coolingTypeLabel"),
      value: pickLookupName(catalog.coolingType, locale),
      raw: null,
    });
  }
  if (catalog.finalDriveType) {
    rows.push({
      key: "finalDriveType",
      label: t("finalDriveTypeLabel"),
      value: pickLookupName(catalog.finalDriveType, locale),
      raw: null,
    });
  }
  if (catalog.driveType) {
    rows.push({
      key: "driveType",
      label: t("driveTypeLabel"),
      value: pickLookupName(catalog.driveType, locale),
      raw: null,
    });
  }
  if (catalog.hasLockingDifferential != null) {
    rows.push({
      key: "lockingDifferential",
      label: t("lockingDifferentialLabel"),
      value: catalog.hasLockingDifferential ? t("yes") : t("no"),
      raw: catalog.hasLockingDifferential ? 1 : 0,
    });
  }
  if (catalog.weightKg != null) {
    rows.push({ key: "weight", label: t("weightLabel"), value: `${catalog.weightKg} kg`, raw: catalog.weightKg });
  }
  if (catalog.seatHeightMm != null) {
    rows.push({
      key: "seatHeight",
      label: t("seatHeightLabel"),
      value: `${catalog.seatHeightMm} mm`,
      raw: catalog.seatHeightMm,
    });
  }
  if (catalog.fuelTankLiters != null) {
    rows.push({
      key: "fuelTank",
      label: t("fuelTankLabel"),
      value: `${catalog.fuelTankLiters} L`,
      raw: catalog.fuelTankLiters,
    });
  }
  if (catalog.topSpeedKmh != null) {
    rows.push({
      key: "topSpeed",
      label: t("topSpeedLabel"),
      value: `${catalog.topSpeedKmh} km/h`,
      raw: catalog.topSpeedKmh,
    });
  }
  if (catalog.hasAbs != null) {
    rows.push({
      key: "abs",
      label: t("absLabel"),
      value: catalog.hasAbs ? t("yes") : t("no"),
      raw: catalog.hasAbs ? 1 : 0,
    });
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
