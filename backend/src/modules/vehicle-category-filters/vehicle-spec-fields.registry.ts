import type { LookupType } from "../lookups/lookups.registry.js";
import type { VehicleSpecField } from "../../generated/prisma/index.js";

export type SpecFieldKind = "LOOKUP" | "NUMBER" | "BOOLEAN";

export type SpecFieldDefinition = {
  kind: SpecFieldKind;
  // The Prisma column on VehicleCatalog this field reads/filters on — an
  // *Id column (fuelTypeId, ...) for LOOKUP kind, the scalar column itself
  // for NUMBER/BOOLEAN kind.
  column: string;
  lookupType?: LookupType;
  nameKa: string;
  nameEn: string;
  nameRu: string;
};

export const VEHICLE_SPEC_FIELDS: Record<VehicleSpecField, SpecFieldDefinition> = {
  FUEL_TYPE: {
    kind: "LOOKUP",
    column: "fuelTypeId",
    lookupType: "fuel-types",
    nameKa: "საწვავის ტიპი",
    nameEn: "Fuel type",
    nameRu: "Тип топлива",
  },
  TRANSMISSION_TYPE: {
    kind: "LOOKUP",
    column: "transmissionTypeId",
    lookupType: "transmission-types",
    nameKa: "გადაცემათა კოლოფის ტიპი",
    nameEn: "Transmission type",
    nameRu: "Тип трансмиссии",
  },
  COOLING_TYPE: {
    kind: "LOOKUP",
    column: "coolingTypeId",
    lookupType: "cooling-types",
    nameKa: "გაგრილების ტიპი",
    nameEn: "Cooling type",
    nameRu: "Тип охлаждения",
  },
  FINAL_DRIVE_TYPE: {
    kind: "LOOKUP",
    column: "finalDriveTypeId",
    lookupType: "final-drive-types",
    nameKa: "გადაცემის ტიპი",
    nameEn: "Final drive type",
    nameRu: "Тип привода",
  },
  DRIVE_TYPE: {
    kind: "LOOKUP",
    column: "driveTypeId",
    lookupType: "drive-types",
    nameKa: "წამყვანი თვლების ტიპი",
    nameEn: "Drive type",
    nameRu: "Тип колёсной формулы",
  },
  START_TYPE: {
    kind: "LOOKUP",
    column: "startTypeId",
    lookupType: "start-types",
    nameKa: "გაშვების სისტემა",
    nameEn: "Start type",
    nameRu: "Тип запуска",
  },
  POWERTRAIN_TYPE: {
    kind: "LOOKUP",
    column: "powertrainTypeId",
    lookupType: "powertrain-types",
    nameKa: "ძრავის კვების ტიპი",
    nameEn: "Powertrain type",
    nameRu: "Тип силовой установки",
  },
  ENGINE_VOLUME_CC: {
    kind: "NUMBER",
    column: "engineVolumeCc",
    nameKa: "ძრავის მოცულობა (სმ³)",
    nameEn: "Engine volume (cc)",
    nameRu: "Объём двигателя (см³)",
  },
  ENGINE_POWER_HP: {
    kind: "NUMBER",
    column: "enginePowerHp",
    nameKa: "ძრავის სიმძლავრე (ცხ.ძ.)",
    nameEn: "Engine power (hp)",
    nameRu: "Мощность двигателя (л.с.)",
  },
  CYLINDER_COUNT: {
    kind: "NUMBER",
    column: "cylinderCount",
    nameKa: "ცილინდრების რაოდენობა",
    nameEn: "Cylinder count",
    nameRu: "Количество цилиндров",
  },
  GEAR_COUNT: {
    kind: "NUMBER",
    column: "gearCount",
    nameKa: "გადაცემების რაოდენობა",
    nameEn: "Gear count",
    nameRu: "Количество передач",
  },
  SEAT_COUNT: {
    kind: "NUMBER",
    column: "seatCount",
    nameKa: "სავარძლების რაოდენობა",
    nameEn: "Seat count",
    nameRu: "Количество мест",
  },
  WEIGHT_KG: {
    kind: "NUMBER",
    column: "weightKg",
    nameKa: "წონა (კგ)",
    nameEn: "Weight (kg)",
    nameRu: "Вес (кг)",
  },
  SEAT_HEIGHT_MM: {
    kind: "NUMBER",
    column: "seatHeightMm",
    nameKa: "სავარძლის სიმაღლე (მმ)",
    nameEn: "Seat height (mm)",
    nameRu: "Высота сиденья (мм)",
  },
  FUEL_TANK_LITERS: {
    kind: "NUMBER",
    column: "fuelTankLiters",
    nameKa: "საწვავის ავზი (ლ)",
    nameEn: "Fuel tank (L)",
    nameRu: "Топливный бак (л)",
  },
  TOP_SPEED_KMH: {
    kind: "NUMBER",
    column: "topSpeedKmh",
    nameKa: "მაქსიმალური სიჩქარე (კმ/სთ)",
    nameEn: "Top speed (km/h)",
    nameRu: "Максимальная скорость (км/ч)",
  },
  MOTOR_POWER_WATT: {
    kind: "NUMBER",
    column: "motorPowerWatt",
    nameKa: "ელექტროძრავის სიმძლავრე (ვტ)",
    nameEn: "Motor power (W)",
    nameRu: "Мощность мотора (Вт)",
  },
  BATTERY_CAPACITY_WH: {
    kind: "NUMBER",
    column: "batteryCapacityWh",
    nameKa: "ბატარეის ტევადობა (ვტ*სთ)",
    nameEn: "Battery capacity (Wh)",
    nameRu: "Ёмкость батареи (Вт*ч)",
  },
  RANGE_KM: {
    kind: "NUMBER",
    column: "rangeKm",
    nameKa: "სვლის მარაგი (კმ)",
    nameEn: "Range (km)",
    nameRu: "Запас хода (км)",
  },
  CHARGING_TIME_MINUTES: {
    kind: "NUMBER",
    column: "chargingTimeMinutes",
    nameKa: "დატენვის დრო (წთ)",
    nameEn: "Charging time (min)",
    nameRu: "Время зарядки (мин)",
  },
  HAS_ABS: {
    kind: "BOOLEAN",
    column: "hasAbs",
    nameKa: "ABS სისტემა",
    nameEn: "ABS",
    nameRu: "ABS",
  },
  HAS_LOCKING_DIFFERENTIAL: {
    kind: "BOOLEAN",
    column: "hasLockingDifferential",
    nameKa: "დიფერენციალის ბლოკირება",
    nameEn: "Locking differential",
    nameRu: "Блокировка дифференциала",
  },
};

export function getSpecFieldDefinition(field: VehicleSpecField): SpecFieldDefinition {
  return VEHICLE_SPEC_FIELDS[field];
}
