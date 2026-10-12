import { describe, expect, it } from "vitest";
import { currentSeasonKey } from "./season.js";

describe("currentSeasonKey", () => {
  it.each([
    ["2026-04-01", "SUMMER"],
    ["2026-07-15", "SUMMER"],
    ["2026-09-30", "SUMMER"],
    ["2026-10-01", "WINTER"],
    ["2026-12-31", "WINTER"],
    ["2027-01-10", "WINTER"],
    ["2027-03-31", "WINTER"],
  ])("%s -> %s", (date, expected) => {
    expect(currentSeasonKey(new Date(`${date}T12:00:00`))).toBe(expected);
  });
});
