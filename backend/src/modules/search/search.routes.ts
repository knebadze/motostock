import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import * as searchController from "./search.controller.js";
import { searchSuggestQuerySchema, searchSuggestResponseSchema } from "./search.schema.js";

export const searchRouter = Router();

// Public — the header's global search dropdown.
searchRouter.get("/suggest", validate(searchSuggestQuerySchema, "query"), searchController.suggest);

registry.registerPath({
  method: "get",
  path: "/search/suggest",
  tags: ["Search"],
  summary: "Global search suggestions: top matching products, vehicle listings and categories (public)",
  request: { query: searchSuggestQuerySchema },
  responses: {
    200: { description: "Suggestions", content: { "application/json": { schema: searchSuggestResponseSchema } } },
    400: { description: "Query too short/long", content: { "application/json": { schema: errorResponseSchema } } },
  },
});
