"use client";

import { Select, type SelectOption } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import type { LookupItem } from "@/lib/api/lookups";
import type { FieldErrors } from "@/lib/validation/common";

function lookupOptions(items: LookupItem[]): SelectOption[] {
  return items.map((item) => ({ value: String(item.id), label: item.nameKa }));
}

// The "identity + full spec sheet" tab of the vehicle catalog form —
// category/brand/model, then every numeric/lookup spec field. Kept as one
// component (not split further) to mirror ProductForm.tsx's "main" tab,
// which is left whole for the same reason: the ~25 independent scalar
// fields here really are that many distinct inputs on the underlying
// VehicleCatalog model — no grouping boundary among them is more "real"
// than any other, so splitting further would just relocate props without
// reducing genuine complexity.
export function VehicleCatalogSpecsTab({
  categoryOptions,
  categoryFilter,
  onCategoryFilterChange,
  brandOptions,
  brandId,
  onBrandChange,
  modelOptions,
  modelId,
  onModelChange,
  variant,
  onVariantChange,
  powertrainTypes,
  powertrainTypeId,
  onPowertrainTypeIdChange,
  isElectric,
  yearFrom,
  onYearFromChange,
  yearTo,
  onYearToChange,
  motorPowerWatt,
  onMotorPowerWattChange,
  batteryCapacityWh,
  onBatteryCapacityWhChange,
  rangeKm,
  onRangeKmChange,
  chargingTimeMinutes,
  onChargingTimeMinutesChange,
  engineVolumeCc,
  onEngineVolumeCcChange,
  enginePowerHp,
  onEnginePowerHpChange,
  cylinderCount,
  onCylinderCountChange,
  gearCount,
  onGearCountChange,
  seatCount,
  onSeatCountChange,
  weightKg,
  onWeightKgChange,
  seatHeightMm,
  onSeatHeightMmChange,
  topSpeedKmh,
  onTopSpeedKmhChange,
  fuelTankLiters,
  onFuelTankLitersChange,
  hasAbs,
  onHasAbsChange,
  fuelTypes,
  fuelTypeId,
  onFuelTypeIdChange,
  transmissionTypes,
  transmissionTypeId,
  onTransmissionTypeIdChange,
  coolingTypes,
  coolingTypeId,
  onCoolingTypeIdChange,
  finalDriveTypes,
  finalDriveTypeId,
  onFinalDriveTypeIdChange,
  driveTypes,
  driveTypeId,
  onDriveTypeIdChange,
  startTypes,
  startTypeId,
  onStartTypeIdChange,
  hasLockingDifferential,
  onHasLockingDifferentialChange,
  errors,
}: {
  categoryOptions: SelectOption[];
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  brandOptions: SelectOption[];
  brandId: string;
  onBrandChange: (value: string) => void;
  modelOptions: SelectOption[];
  modelId: string;
  onModelChange: (value: string) => void;
  variant: string;
  onVariantChange: (value: string) => void;
  powertrainTypes: LookupItem[];
  powertrainTypeId: string;
  onPowertrainTypeIdChange: (value: string) => void;
  isElectric: boolean;
  yearFrom: string;
  onYearFromChange: (value: string) => void;
  yearTo: string;
  onYearToChange: (value: string) => void;
  motorPowerWatt: string;
  onMotorPowerWattChange: (value: string) => void;
  batteryCapacityWh: string;
  onBatteryCapacityWhChange: (value: string) => void;
  rangeKm: string;
  onRangeKmChange: (value: string) => void;
  chargingTimeMinutes: string;
  onChargingTimeMinutesChange: (value: string) => void;
  engineVolumeCc: string;
  onEngineVolumeCcChange: (value: string) => void;
  enginePowerHp: string;
  onEnginePowerHpChange: (value: string) => void;
  cylinderCount: string;
  onCylinderCountChange: (value: string) => void;
  gearCount: string;
  onGearCountChange: (value: string) => void;
  seatCount: string;
  onSeatCountChange: (value: string) => void;
  weightKg: string;
  onWeightKgChange: (value: string) => void;
  seatHeightMm: string;
  onSeatHeightMmChange: (value: string) => void;
  topSpeedKmh: string;
  onTopSpeedKmhChange: (value: string) => void;
  fuelTankLiters: string;
  onFuelTankLitersChange: (value: string) => void;
  hasAbs: boolean;
  onHasAbsChange: (value: boolean) => void;
  fuelTypes: LookupItem[];
  fuelTypeId: string;
  onFuelTypeIdChange: (value: string) => void;
  transmissionTypes: LookupItem[];
  transmissionTypeId: string;
  onTransmissionTypeIdChange: (value: string) => void;
  coolingTypes: LookupItem[];
  coolingTypeId: string;
  onCoolingTypeIdChange: (value: string) => void;
  finalDriveTypes: LookupItem[];
  finalDriveTypeId: string;
  onFinalDriveTypeIdChange: (value: string) => void;
  driveTypes: LookupItem[];
  driveTypeId: string;
  onDriveTypeIdChange: (value: string) => void;
  startTypes: LookupItem[];
  startTypeId: string;
  onStartTypeIdChange: (value: string) => void;
  hasLockingDifferential: boolean;
  onHasLockingDifferentialChange: (value: boolean) => void;
  errors: FieldErrors;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">ტიპი (ფილტრი)</label>
          <Select
            options={categoryOptions}
            value={categoryFilter}
            onChange={onCategoryFilterChange}
            searchable
            placeholder="ყველა ტიპი"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">მარკა *</label>
          <Select
            options={brandOptions}
            value={brandId}
            onChange={onBrandChange}
            searchable
            placeholder="აირჩიეთ მარკა"
          />
          <FieldError message={errors.brandId} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">მოდელი *</label>
          <Select
            options={modelOptions}
            value={modelId}
            onChange={onModelChange}
            searchable
            disabled={!brandId}
            placeholder={brandId ? "აირჩიეთ მოდელი" : "ჯერ აირჩიეთ მარკა"}
          />
          <FieldError message={errors.modelId} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="vc-variant" className="text-sm font-medium">
          ვარიანტი / კომპლექტაცია
        </label>
        <input
          id="vc-variant"
          type="text"
          value={variant}
          onChange={(event) => onVariantChange(event.target.value)}
          placeholder="მაგ. ABS, Special Edition (არასავალდებულო)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <FieldError message={errors.variant} />
        <p className="text-xs text-muted-foreground">
          გამოიყენეთ, თუ ერთი და იმავე მოდელის რამდენიმე კონფიგურაცია გაქვთ კატალოგში
          (განსხვავებული სპეც-მონაცემებით).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">ძრავის ტიპი</label>
          <Select
            options={lookupOptions(powertrainTypes)}
            value={powertrainTypeId}
            onChange={onPowertrainTypeIdChange}
            placeholder="— არცერთი —"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vc-year-from" className="text-sm font-medium">
            წელი (დან)
          </label>
          <input
            id="vc-year-from"
            type="number"
            value={yearFrom}
            onChange={(event) => onYearFromChange(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.yearFrom} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vc-year-to" className="text-sm font-medium">
            წელი (მდე)
          </label>
          <input
            id="vc-year-to"
            type="number"
            value={yearTo}
            onChange={(event) => onYearToChange(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.yearTo} />
        </div>
        {isElectric ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vc-motor-watt" className="text-sm font-medium">
                ძრავის სიმძლავრე (ვტ)
              </label>
              <input
                id="vc-motor-watt"
                type="number"
                value={motorPowerWatt}
                onChange={(event) => onMotorPowerWattChange(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.motorPowerWatt} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vc-battery-wh" className="text-sm font-medium">
                აკუმულატორი (Wh)
              </label>
              <input
                id="vc-battery-wh"
                type="number"
                value={batteryCapacityWh}
                onChange={(event) => onBatteryCapacityWhChange(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.batteryCapacityWh} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vc-range-km" className="text-sm font-medium">
                სავალი მანძილი (კმ)
              </label>
              <input
                id="vc-range-km"
                type="number"
                value={rangeKm}
                onChange={(event) => onRangeKmChange(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.rangeKm} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vc-charging-time" className="text-sm font-medium">
                დამუხტვის დრო (წთ)
              </label>
              <input
                id="vc-charging-time"
                type="number"
                value={chargingTimeMinutes}
                onChange={(event) => onChargingTimeMinutesChange(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.chargingTimeMinutes} />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vc-engine-cc" className="text-sm font-medium">
                მოცულობა (cc)
              </label>
              <input
                id="vc-engine-cc"
                type="number"
                value={engineVolumeCc}
                onChange={(event) => onEngineVolumeCcChange(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.engineVolumeCc} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vc-power-hp" className="text-sm font-medium">
                სიმძლავრე (ც.ძ)
              </label>
              <input
                id="vc-power-hp"
                type="number"
                value={enginePowerHp}
                onChange={(event) => onEnginePowerHpChange(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.enginePowerHp} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vc-cylinders" className="text-sm font-medium">
                ცილინდრები
              </label>
              <input
                id="vc-cylinders"
                type="number"
                value={cylinderCount}
                onChange={(event) => onCylinderCountChange(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.cylinderCount} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vc-gears" className="text-sm font-medium">
                გადაცემები
              </label>
              <input
                id="vc-gears"
                type="number"
                value={gearCount}
                onChange={(event) => onGearCountChange(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.gearCount} />
            </div>
          </>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vc-seats" className="text-sm font-medium">
            ადგილები
          </label>
          <input
            id="vc-seats"
            type="number"
            value={seatCount}
            onChange={(event) => onSeatCountChange(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.seatCount} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vc-weight-kg" className="text-sm font-medium">
            წონა (კგ)
          </label>
          <input
            id="vc-weight-kg"
            type="number"
            value={weightKg}
            onChange={(event) => onWeightKgChange(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.weightKg} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vc-seat-height" className="text-sm font-medium">
            სავარძლის სიმაღლე (მმ)
          </label>
          <input
            id="vc-seat-height"
            type="number"
            value={seatHeightMm}
            onChange={(event) => onSeatHeightMmChange(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.seatHeightMm} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vc-top-speed" className="text-sm font-medium">
            მაქს. სიჩქარე (კმ/სთ)
          </label>
          <input
            id="vc-top-speed"
            type="number"
            value={topSpeedKmh}
            onChange={(event) => onTopSpeedKmhChange(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.topSpeedKmh} />
        </div>
        {!isElectric && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vc-fuel-tank" className="text-sm font-medium">
              საწვავის ავზი (ლ)
            </label>
            <input
              id="vc-fuel-tank"
              type="number"
              step="0.1"
              value={fuelTankLiters}
              onChange={(event) => onFuelTankLitersChange(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.fuelTankLiters} />
          </div>
        )}
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={hasAbs}
            onChange={(event) => onHasAbsChange(event.target.checked)}
            className="size-4 rounded border-border accent-primary"
          />
          ABS
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {!isElectric && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">საწვავის ტიპი</label>
            <Select
              options={lookupOptions(fuelTypes)}
              value={fuelTypeId}
              onChange={onFuelTypeIdChange}
              searchable
              placeholder="— არცერთი —"
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">გადაცემათა კოლოფი</label>
          <Select
            options={lookupOptions(transmissionTypes)}
            value={transmissionTypeId}
            onChange={onTransmissionTypeIdChange}
            searchable
            placeholder="— არცერთი —"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">გაგრილება</label>
          <Select
            options={lookupOptions(coolingTypes)}
            value={coolingTypeId}
            onChange={onCoolingTypeIdChange}
            searchable
            placeholder="— არცერთი —"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">საბოლოო გადაცემა</label>
          <Select
            options={lookupOptions(finalDriveTypes)}
            value={finalDriveTypeId}
            onChange={onFinalDriveTypeIdChange}
            searchable
            placeholder="— არცერთი —"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">წამყვანი თვლები</label>
          <Select
            options={lookupOptions(driveTypes)}
            value={driveTypeId}
            onChange={onDriveTypeIdChange}
            searchable
            placeholder="— არცერთი —"
          />
        </div>
        {!isElectric && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">გაშვების სისტემა</label>
            <Select
              options={lookupOptions(startTypes)}
              value={startTypeId}
              onChange={onStartTypeIdChange}
              searchable
              placeholder="— არცერთი —"
            />
          </div>
        )}
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={hasLockingDifferential}
            onChange={(event) => onHasLockingDifferentialChange(event.target.checked)}
            className="size-4 rounded border-border accent-primary"
          />
          დიფერენციალის ბლოკირება
        </label>
      </div>
    </>
  );
}
