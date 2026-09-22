import { z } from "zod";
import { requiredIntString, requiredSelectString } from "./common";

const MIN_AGE_YEARS = 16;

// Workshop "+ ახალი სტუმარი მომხმარებელი" modal — mirrors the backend's
// dateOfBirthField minimum-age sanity check (backend/src/lib/date-of-birth.ts).
export const walkInUserFormSchema = z.object({
  firstName: z.string().trim().min(2, "სახელი უნდა შეიცავდეს 2-50 სიმბოლოს").max(50),
  lastName: z.string().trim().min(2, "გვარი უნდა შეიცავდეს 2-50 სიმბოლოს").max(50),
  phone: z.string().trim().min(9, "ტელეფონის ნომერი არასწორია").max(20, "ტელეფონის ნომერი არასწორია"),
  dateOfBirth: z
    .string()
    .min(1, "შეავსეთ დაბადების თარიღი")
    .refine((value) => {
      const dob = new Date(value);
      if (Number.isNaN(dob.getTime())) return false;
      const minBirthDate = new Date();
      minBirthDate.setFullYear(minBirthDate.getFullYear() - MIN_AGE_YEARS);
      return dob <= minBirthDate;
    }, `ასაკი უნდა იყოს მინიმუმ ${MIN_AGE_YEARS} წელი`),
});

// Workshop "+ ტრანსპორტის დამატება" modal — same shape as CreateGarageVehicleInput.
export const workshopGarageVehicleFormSchema = z.object({
  vehicleCatalogId: requiredSelectString("აირჩიეთ ტექნიკა კატალოგიდან"),
  year: requiredIntString({ min: 1900, max: 2100, message: "შეავსეთ წელი" }),
  vin: z.string().trim().max(32).optional(),
});
