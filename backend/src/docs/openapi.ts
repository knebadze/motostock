import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry.js";
import { SITE_NAME } from "../config/site.js";

// OpenAPI 3.1, not 3.0: 3.0 has no way to say "this $ref'd object, or null"
// (zod-to-openapi emits `allOf: [$ref] + nullable`, which openapi-typescript
// reads as non-null), so every nullable lookup/ref field came out non-null
// in the frontend's generated types (npm run api:types). 3.1 expresses it as
// `anyOf: [$ref, {type: "null"}]`. Swagger UI 5 renders 3.1 fine.
export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return normalizeNullableRefs(generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: `${SITE_NAME} API`,
      version: "0.1.0",
      description: `REST API for the ${SITE_NAME} moto-gear shop.`,
    },
    servers: [{ url: "/api" }],
  }));
}

// zod-to-openapi (v3.1 generator) encodes `someRefSchema.nullable()` as
// `allOf: [{ $ref }, { type: ["object", "null"] }]` — read literally that's
// "the ref AND (object or null)", i.e. never null, so generated client types
// (openapi-typescript) came out wrong. Rewrites exactly that shape to the
// standard `anyOf: [{ $ref }, { type: "null" }]`; everything else untouched.
function normalizeNullableRefs<T>(node: T): T {
  if (Array.isArray(node)) return node.map(normalizeNullableRefs) as T;
  if (!node || typeof node !== "object") return node;

  const record = node as Record<string, unknown>;
  const allOf = record.allOf;
  if (Array.isArray(allOf) && allOf.length === 2 && Object.keys(record).length === 1) {
    const [ref, nullablePart] = allOf as Record<string, unknown>[];
    const nullableType = nullablePart?.type;
    if (
      typeof ref?.$ref === "string" &&
      Object.keys(nullablePart ?? {}).length === 1 &&
      Array.isArray(nullableType) &&
      nullableType.includes("null")
    ) {
      return { anyOf: [ref, { type: "null" }] } as T;
    }
  }

  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, normalizeNullableRefs(value)])) as T;
}
