import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Source = "body" | "query" | "params";

export function validate(schema: ZodType, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }

    // Express 5's `req.query` is a getter-only accessor that recomputes a
    // fresh object from the raw query string on every access (no setter,
    // no memoization) — so neither `req.query = result.data` (throws, no
    // setter) nor mutating the object returned by one access (silently
    // discarded, since the next `req.query` read recomputes from scratch)
    // actually propagates the coerced values to downstream handlers.
    // Replacing the accessor with a plain data property is the only way
    // the validated/coerced result sticks for the rest of the request.
    if (source === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      req[source] = result.data;
    }
    next();
  };
}
