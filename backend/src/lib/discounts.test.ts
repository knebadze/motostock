import { describe, expect, it } from "vitest";
import { applyPercentDiscount } from "./discounts.js";

describe("applyPercentDiscount", () => {
  it("derives the price from the current list price", () => {
    expect(applyPercentDiscount(160, 10)).toBe(144);
    // Same 10% after a price change — not frozen at the old 144.
    expect(applyPercentDiscount(170, 10)).toBe(153);
  });

  it("rounds to cents", () => {
    expect(applyPercentDiscount(99.99, 15)).toBe(84.99);
    expect(applyPercentDiscount(8500, 7.5)).toBe(7862.5);
  });
});
