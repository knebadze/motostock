// Compile-time guard that a service's response mapper actually returns what
// its OpenAPI response schema documents. Those schemas are documentation
// only (never validated at runtime), yet the frontend's types are now
// generated from them (frontend `npm run api:types`) — so a mapper that
// drifts from its schema would hand the frontend types that lie. Used as:
//
//   type _ProductContract = Expect<ResponseMatches<
//     Awaited<ReturnType<typeof toResponse>>,
//     z.infer<typeof productResponseSchema>
//   >>;
//
// A mismatch fails `tsc` right at that line (the error shows both shapes).
// Zero runtime cost.

// What res.json() actually sends: Dates become ISO strings, anything with a
// toJSON() (e.g. Prisma Decimal) becomes its JSON form — recursively.
export type Jsonified<T> = T extends Date
  ? string
  : T extends { toJSON(): infer J }
    ? J
    : T extends (infer U)[]
      ? Jsonified<U>[]
      : T extends object
        ? { [K in keyof T]: Jsonified<T[K]> }
        : T;

// Every documented field must be present on the serialized mapper output
// with a compatible type. Extra, undocumented mapper fields aren't flagged —
// they're invisible to the generated frontend types anyway.
export type ResponseMatches<Actual, Documented> = [Jsonified<Actual>] extends [Documented]
  ? true
  : { mismatch: true; actual: Jsonified<Actual>; documented: Documented };

export type Expect<T extends true> = T;
