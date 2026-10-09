import type { paths } from "./generated/schema";

type JsonBody<Response> = Response extends { content: { "application/json": infer Body } } ? Body : never;

// The documented success (200, or 201 for creates) JSON body of
// `METHOD path` in the backend's OpenAPI document — for response envelopes
// that have no named schema of their own (e.g. `{ orders, total, page,
// pageSize }`). Paths are relative to /api.
export type ApiResponse<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = paths[Path][Method] extends { responses: infer Responses }
  ? Responses extends { 200: infer Ok }
    ? JsonBody<Ok>
    : Responses extends { 201: infer Created }
      ? JsonBody<Created>
      : never
  : never;
