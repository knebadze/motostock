// Every money column in this schema is `@db.Decimal(10, 2)` — 10 total
// digits, 2 after the decimal point, so 99,999,999.99 is the largest value
// Postgres will actually store. None of the zod schemas validating a
// user-typed price/discountPrice against one of these columns had a
// `.max()` matching that ceiling, so submitting one digit over it (an easy
// admin fat-finger, not just a malicious input) skipped straight past zod
// validation and hit Postgres's own numeric-overflow rejection instead —
// which neither error.middleware.ts nor lib/prismaErrors.ts maps to a
// friendly message, so it surfaced as a raw, unexplained 500 rather than a
// clear "ფასი არ უნდა აღემატებოდეს ..." validation error.
export const MAX_DECIMAL_10_2 = 99_999_999.99;
