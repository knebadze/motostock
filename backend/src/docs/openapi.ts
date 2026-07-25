import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry.js";

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "MotoStock API",
      version: "0.1.0",
      description: "REST API for the MotoStock moto-gear shop.",
    },
    servers: [{ url: "/api" }],
  });
}
