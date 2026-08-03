// Shared shape for the admin "filter everything" request entries — sent as
// one JSON-encoded `adminFilters` query param, read by every domain's
// backend registry (backend/src/modules/filters/*/*-filter-registry.ts).
export type AdminFilterEntry = { key: string; value: unknown };
