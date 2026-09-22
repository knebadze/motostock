import { z } from "zod";

const MIN_AGE_YEARS = 16;

// Shared by auth.schema.ts (registration) and the walk-in-customer creation
// schema — a plain sanity minimum age, not a legal/regulatory requirement
// (no existing precedent for this in the codebase to mirror).
export const dateOfBirthField = z.iso
  .date()
  .refine(
    (value) => {
      const dob = new Date(value);
      const minBirthDate = new Date();
      minBirthDate.setFullYear(minBirthDate.getFullYear() - MIN_AGE_YEARS);
      return dob <= minBirthDate;
    },
    { message: `ასაკი უნდა იყოს მინიმუმ ${MIN_AGE_YEARS} წელი` },
  )
  .openapi({ example: "1995-06-15" });
