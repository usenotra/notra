import { expect, test } from "bun:test";

import type {
  GeoPersona,
  GeoPersonaActivityPoint,
  GeoPersonaActivityResponse,
} from "@notra/geo-core/types/geo-personas";

import { GEO_PERSONA_FORECAST_DAYS } from "@/constants/geo-personas";

import {
  buildPersonaActivityRows,
  buildPersonaActivitySeries,
  personaActivityKey,
  personaForecastKey,
} from "./persona-activity";

const PERSONA_ID = "persona-1";
const SNAPSHOT = "snap-aaa";
const DATA_KEY = personaActivityKey(PERSONA_ID, SNAPSHOT);
const FORECAST_KEY = personaForecastKey(PERSONA_ID, SNAPSHOT);

const persona = {
  id: PERSONA_ID,
  name: "DevTool Trendsetter",
  role: "Engineer",
  company: "Acme",
  summary: "",
  searchStyle: "",
  profile: {
    goals: [],
    painPoints: [],
    currentStack: [],
    buyingTriggers: [],
    objections: [],
  },
  conversationPrompts: [],
  enabled: true,
  archivedAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  memories: [],
} satisfies GeoPersona;

function point(
  day: string,
  mentions: number,
  checks: number
): GeoPersonaActivityPoint {
  return {
    personaId: PERSONA_ID,
    snapshotVersion: SNAPSHOT,
    day,
    lastCheckedAt: `${day}T12:00:00.000Z`,
    checks,
    mentions,
  };
}

function activity(
  from: string,
  to: string,
  points: GeoPersonaActivityPoint[]
): GeoPersonaActivityResponse {
  return { from, to, points };
}

test("days before the first scan sit on the zero line as actual, not a forecast", () => {
  const data = activity("2026-09-21", "2026-09-24", [
    point("2026-09-23", 3, 8),
  ]);
  const series = buildPersonaActivitySeries(data, [persona]);
  const rows = buildPersonaActivityRows(data, series, "2026-09-23");

  expect(rows.map((row) => row.day)).toEqual([
    "2026-09-21",
    "2026-09-22",
    "2026-09-23",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
    "2026-09-27",
    "2026-09-28",
    "2026-09-29",
    "2026-09-30",
  ]);
  expect(rows).toHaveLength(3 + GEO_PERSONA_FORECAST_DAYS);
  expect(rows[0]?.[DATA_KEY]).toBe(0);
  expect(rows[1]?.[DATA_KEY]).toBe(0);
  expect(rows[2]?.[DATA_KEY]).toBe(37.5);
  expect(rows[2]?.[FORECAST_KEY]).toBe(37.5);
  expect(rows[3]?.[DATA_KEY]).toBeNull();
  expect(rows[3]?.[FORECAST_KEY]).toBe(37.5);
});

test("a scan that is not on the range end stays actual and does not grow a forecast tail", () => {
  const data = activity("2026-09-20", "2026-09-23", [
    point("2026-09-21", 1, 4),
  ]);
  const series = buildPersonaActivitySeries(data, [persona]);
  const rows = buildPersonaActivityRows(data, series, "2026-09-23");

  expect(rows.map((row) => row.day)).toEqual([
    "2026-09-20",
    "2026-09-21",
    "2026-09-22",
  ]);
  expect(rows[0]?.[DATA_KEY]).toBe(0);
  expect(rows[1]?.[DATA_KEY]).toBe(25);
  expect(rows[2]?.[DATA_KEY]).toBeNull();
  expect(rows.some((row) => FORECAST_KEY in row)).toBe(false);
});
