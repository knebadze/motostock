import { describe, expect, it } from "vitest";
import { pickTagCompanionIds } from "./tag-companions.js";

describe("pickTagCompanionIds", () => {
  it("keeps the SQL ranking order", () => {
    expect(pickTagCompanionIds([5, 3, 9], new Set([3, 5, 9]), new Set(), 4)).toEqual([5, 3, 9]);
  });

  it("drops ineligible candidates (out of stock, not purchasable, incompatible)", () => {
    expect(pickTagCompanionIds([5, 3, 9], new Set([9, 5]), new Set(), 4)).toEqual([5, 9]);
  });

  it("drops products already in the curated buy-together list", () => {
    expect(pickTagCompanionIds([5, 3, 9], new Set([3, 5, 9]), new Set([5]), 4)).toEqual([3, 9]);
  });

  it("stops at the limit (the free slots left after the curated ones)", () => {
    expect(pickTagCompanionIds([1, 2, 3, 4], new Set([1, 2, 3, 4]), new Set(), 2)).toEqual([1, 2]);
  });

  it("returns nothing when no slot is left", () => {
    expect(pickTagCompanionIds([1, 2], new Set([1, 2]), new Set(), 0)).toEqual([]);
  });

  it("ignores duplicate candidate ids", () => {
    expect(pickTagCompanionIds([7, 7, 8], new Set([7, 8]), new Set(), 4)).toEqual([7, 8]);
  });
});
