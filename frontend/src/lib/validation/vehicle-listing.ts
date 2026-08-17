import { z } from "zod";
import {
  optionalIntString,
  requiredIntString,
  requiredPositiveDecimalString,
  requiredSelectString,
} from "./common";

export const vehicleListingFormSchema = z
  .object({
    vehicleCatalogId: requiredSelectString("აირჩიეთ ტექნიკა"),
    conditionId: requiredSelectString("აირჩიეთ მდგომარეობა"),
    statusId: requiredSelectString("აირჩიეთ სტატუსი"),
    colorId: requiredSelectString("აირჩიეთ ფერი"),
    year: requiredIntString({ min: 1900, max: 2100, message: "წელი 1900-2100 შუალედში" }),
    mileageKm: optionalIntString({ min: 0, message: "მინ. 0" }),
    warrantyValue: optionalIntString({ min: 1, message: "მინ. 1" }),
    warrantyUnit: z.string(),
    price: requiredPositiveDecimalString("მიუთითეთ ფასი"),
    stockQuantity: optionalIntString({ min: 1, message: "მინ. 1" }),
  })
  .superRefine((data, ctx) => {
    const hasValue = data.warrantyValue.trim() !== "";
    const hasUnit = data.warrantyUnit.trim() !== "";
    if (hasValue !== hasUnit) {
      ctx.addIssue({
        code: "custom",
        message: "გარანტიის მითითებისას საჭიროა როგორც ვადა, ისე ერთეული",
        path: ["warrantyUnit"],
      });
    }
  });
