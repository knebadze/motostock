import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { registry } from "../docs/registry.js";
import { logger } from "../lib/logger.js";

// Development-only drift detector between what an endpoint actually returns
// and what its OpenAPI docs (registry.registerPath) say it returns. Those
// docs are never enforced on their own, yet the frontend's types are
// generated from them (frontend `npm run api:types`) — so an undocumented or
// wrongly-typed field means the frontend's types lie about it. This checks
// every JSON success response against the documented zod schema for its
// route and logs a warning on mismatch; it never changes the response.
// Mounted only when NODE_ENV !== "production" (see app.ts).

type JsonResponseSchemas = Map<number, ZodType>;

function isZodSchema(value: unknown): value is ZodType {
  return typeof (value as { safeParse?: unknown })?.safeParse === "function";
}

// "GET /orders/{id}" → status code → zod schema, built once from the registry.
let routeSchemas: Map<string, JsonResponseSchemas> | null = null;

function buildRouteSchemas(): Map<string, JsonResponseSchemas> {
  const map = new Map<string, JsonResponseSchemas>();
  for (const definition of registry.definitions) {
    if (definition.type !== "route") continue;
    const { method, path, responses } = definition.route;
    const byStatus: JsonResponseSchemas = new Map();
    for (const [status, response] of Object.entries(responses)) {
      const schema = (response as { content?: Record<string, { schema?: unknown }> }).content?.["application/json"]
        ?.schema;
      if (isZodSchema(schema)) byStatus.set(Number(status), schema);
    }
    if (byStatus.size > 0) map.set(`${method.toUpperCase()} ${path}`, byStatus);
  }
  return map;
}

// Express's matched route ("/api" + "/orders" + "/:id") in the docs' form
// ("/orders/{id}" — docs paths are relative to the /api server URL).
function documentedRouteKey(req: Request): string | null {
  const routePath = (req.route as { path?: unknown } | undefined)?.path;
  if (typeof routePath !== "string") return null;
  const fullPath = `${req.baseUrl}${routePath === "/" ? "" : routePath}`
    .replace(/^\/api/, "")
    .replace(/:(\w+)/g, "{$1}");
  return `${req.method} ${fullPath || "/"}`;
}

export function responseValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    try {
      const status = res.statusCode;
      if (status >= 200 && status < 300) {
        routeSchemas ??= buildRouteSchemas();
        const key = documentedRouteKey(req);
        const schema = key ? routeSchemas.get(key)?.get(status) : undefined;
        if (key && schema) {
          // Validate the serialized form — Dates/Decimals only become the
          // documented strings/numbers once JSON-encoded.
          const result = schema.safeParse(JSON.parse(JSON.stringify(body)));
          if (!result.success) {
            logger.warn(
              {
                route: key,
                status,
                issues: result.error.issues.slice(0, 5).map((issue) => ({
                  path: issue.path.join("."),
                  message: issue.message,
                })),
              },
              "Response does not match its documented OpenAPI schema",
            );
          }
        }
      }
    } catch (err) {
      logger.warn({ err }, "Response validation failed to run");
    }
    return originalJson(body);
  };

  next();
}
