import { z } from "zod";
import {
  optionalIntString,
  optionalPositiveDecimalString,
  requiredSelectString,
} from "./common";

const optionalYearString = optionalIntString({
  min: 1900,
  max: 2100,
  message: "წელი 1900-2100 შუალედში",
});
const optionalPositiveIntString = optionalIntString({ min: 1 });

export const vehicleCatalogFormSchema = z
  .object({
    brandId: requiredSelectString("აირჩიეთ მარკა"),
    modelId: requiredSelectString("აირჩიეთ მოდელი"),
    variant: z.string().max(120, "მაქს. 120 სიმბოლო"),
    yearFrom: optionalYearString,
    yearTo: optionalYearString,
    engineVolumeCc: optionalPositiveIntString,
    enginePowerHp: optionalPositiveIntString,
    cylinderCount: optionalPositiveIntString,
    gearCount: optionalPositiveIntString,
    seatCount: optionalPositiveIntString,
    weightKg: optionalPositiveIntString,
    seatHeightMm: optionalPositiveIntString,
    fuelTankLiters: optionalPositiveDecimalString(),
    topSpeedKmh: optionalPositiveIntString,
    motorPowerWatt: optionalPositiveIntString,
    batteryCapacityWh: optionalPositiveIntString,
    rangeKm: optionalPositiveIntString,
    chargingTimeMinutes: optionalPositiveIntString,
  })
  .refine(
    (data) => {
      if (data.yearFrom.trim() === "" || data.yearTo.trim() === "") return true;
      return Number(data.yearFrom) <= Number(data.yearTo);
    },
    { message: "'წელი (დან)' არ უნდა აღემატებოდეს 'წელი (მდე)'-ს", path: ["yearTo"] },
  );
