import rateLimit from "express-rate-limit";

// Baseline DoS/abuse guard applied to every /api request (see app.ts) — high
// enough that a real page load's burst of parallel calls never trips it, low
// enough to blunt scripted scraping/flooding. authRateLimit below stacks on
// top of this with a much tighter budget for the sensitive auth endpoints.
export const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests, please slow down" } },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many attempts, please try again later" } },
});
