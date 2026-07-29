import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry.js";
import { SITE_NAME } from "../config/site.js";

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: `${SITE_NAME} API`,
      version: "0.1.0",
      description: `REST API for the ${SITE_NAME} moto-gear shop.`,
    },
    servers: [{ url: "/api" }],
  });
}
