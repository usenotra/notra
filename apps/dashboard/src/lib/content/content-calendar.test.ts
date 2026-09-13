import { expect, test } from "bun:test";

import {
  getUtcDateKeys,
  getUtcDayRange,
  getUtcYearRange,
} from "./content-calendar";

test("builds today boundaries from the UTC calendar", () => {
  const range = getUtcDayRange("today", new Date("2026-01-01T00:30:00Z"));

  expect(range).toEqual({
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: new Date("2026-01-02T00:00:00.000Z"),
  });
});

test("treats date-only filters as UTC calendar days", () => {
  const range = getUtcDayRange("2025-12-31");

  expect(range).toEqual({
    startDate: new Date("2025-12-31T00:00:00.000Z"),
    endDate: new Date("2026-01-01T00:00:00.000Z"),
  });
});

test("rejects impossible UTC calendar dates", () => {
  expect(getUtcDayRange("2025-02-29")).toBeNull();
  expect(getUtcDayRange("2025-02-30")).toBeNull();
  expect(getUtcDayRange("2024-02-29")).toEqual({
    startDate: new Date("2024-02-29T00:00:00.000Z"),
    endDate: new Date("2024-03-01T00:00:00.000Z"),
  });
});

test("generates UTC year boundaries across New Year", () => {
  const { startDate, endDate } = getUtcYearRange(
    new Date("2024-12-31T23:30:00-02:00")
  );
  const dateKeys = getUtcDateKeys(startDate, endDate);

  expect(startDate).toEqual(new Date("2025-01-01T00:00:00.000Z"));
  expect(endDate).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  expect(dateKeys).toHaveLength(365);
  expect(dateKeys[0]).toBe("2025-01-01");
  expect(dateKeys.at(-1)).toBe("2025-12-31");
});

test("includes February 29 in UTC leap years", () => {
  const { startDate, endDate } = getUtcYearRange(
    new Date("2024-06-15T12:00:00Z")
  );
  const dateKeys = getUtcDateKeys(startDate, endDate);

  expect(dateKeys).toHaveLength(366);
  expect(dateKeys).toContain("2024-02-29");
});
