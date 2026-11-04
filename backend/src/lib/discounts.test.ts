import { describe, expect, it } from "vitest";
import { applyPercentDiscount, findDiscountAtOrAbovePrice } from "./discounts.js";

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

describe("findDiscountAtOrAbovePrice", () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

  it("lets the price drop below a percent discount's stored price (it is re-derived)", () => {
    // 100 GEL, -10% stored as 90 → lowering the price to 85 makes it 76.50.
    const percent = { endDate: future, discountPrice: "90", discountPercent: "10" };
    expect(findDiscountAtOrAbovePrice([percent], 85)).toBeNull();
  });

  it("still blocks dropping the price to or below a fixed discount", () => {
    const fixed = { endDate: future, discountPrice: "90", discountPercent: null };
    expect(findDiscountAtOrAbovePrice([fixed], 85)).toBe(fixed);
    expect(findDiscountAtOrAbovePrice([fixed], 90)).toBe(fixed);
    expect(findDiscountAtOrAbovePrice([fixed], 95)).toBeNull();
  });

  it("ignores ended discounts", () => {
    const ended = { endDate: past, discountPrice: "90", discountPercent: null };
    expect(findDiscountAtOrAbovePrice([ended], 85)).toBeNull();
  });
});
