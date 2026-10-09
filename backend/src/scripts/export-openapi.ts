// Writes the OpenAPI document (the same one /api/docs serves) to the
// frontend, where `npm run api:types` turns it into TypeScript types
// (frontend/src/lib/api/generated/schema.d.ts). Run via the frontend's
// api:types script, or directly: `npm run openapi:export`.
//
// Importing app.ts registers every route's registry.registerPath() as a side
// effect (it doesn't start a server — that's server.ts). Needs the same env
// as the app itself (backend/.env), since config/env.ts validates on import.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../app.js";
import { generateOpenApiDocument } from "../docs/openapi.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(here, "../../../frontend/src/lib/api/generated/openapi.json");

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(generateOpenApiDocument(), null, 2)}\n`);
console.log(`OpenAPI document written to ${outFile}`);

// Importing the app may open handles (DB pool, timers) that would keep the
// process alive.
process.exit(0);
