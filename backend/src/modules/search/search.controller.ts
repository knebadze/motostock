import type { Request, Response } from "express";
import * as searchService from "./search.service.js";
import type { SearchSuggestQuery } from "./search.schema.js";

export async function suggest(req: Request<unknown, unknown, unknown, SearchSuggestQuery>, res: Response) {
  const result = await searchService.getSearchSuggestions(req.query.q);
  res.status(200).json(result);
}
