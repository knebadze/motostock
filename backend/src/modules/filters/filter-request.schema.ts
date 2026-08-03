import { z } from "zod";

// Generic "filter everything" request entry, shared by every admin filter
// registry: { key: "PRICE", value: { min: 100 } }, { key: "BRAND", value: [1,2] }, ...
// `value`'s shape depends on which kind of handler the domain registry has
// registered for that key (RANGE/MULTI_SELECT/BOOLEAN/TEXT) — validated
// there, not here, since the set of valid keys differs per domain.
export const filterEntrySchema = z.object({
  key: z.string().min(1).max(80),
  value: z.unknown(),
});
export type FilterEntry = z.infer<typeof filterEntrySchema>;

// URL-encoded JSON array in a single query param — same pattern as
// products' `attributeFilters` / vehicle-listing's `specFilters`, generalized
// so every admin list endpoint parses it identically.
export const adminFiltersQuerySchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined;
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      ctx.addIssue({ code: "custom", message: "adminFilters არასწორი JSON-ია" });
      return z.NEVER;
    }
    const result = z.array(filterEntrySchema).safeParse(parsed);
    if (!result.success) {
      ctx.addIssue({ code: "custom", message: "adminFilters არასწორი ფორმატია" });
      return z.NEVER;
    }
    return result.data;
  })
  .optional();
export type AdminFiltersQuery = z.infer<typeof adminFiltersQuerySchema>;
