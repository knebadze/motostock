import { z } from "zod";
import {
  optionalIntString,
  requiredIntString,
  requiredPositiveDecimalString,
  requiredSelectString,
} from "./common";

export const vehicleListingFormSchema = z.object({
  vehicleCatalogId: requiredSelectString("აირჩიეთ ტექნიკა"),
  conditionId: requiredSelectString("აირჩიეთ მდგომარეობა"),
  statusId: requiredSelectString("აირჩიეთ სტატუსი"),
  colorId: requiredSelectString("აირჩიეთ ფერი"),
  year: requiredIntString({ min: 1900, max: 2100, message: "წელი 1900-2100 შუალედში" }),
  price: requiredPositiveDecimalString("მიუთითეთ ფასი"),
  stockQuantity: optionalIntString({ min: 1, message: "მინ. 1" }),
});
