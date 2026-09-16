import { describe, expect, test } from "bun:test";

import type {
  GeoPersona,
  GeoPersonaActivityResponse,
} from "@notra/geo-core/types/geo-personas";

import {
  buildPersonaActivityRows,
  buildPersonaActivitySeries,
  personaActivityKey,
  personaForecastKey,
  personaMentionRate,
} from "@/utils/persona-activity";

const persona: GeoPersona = {
  id: "persona-1",
  name: "Budgeter",
  role: "Founder",
  company: "Small SaaS company",
  summary: "Optimizes for predictable ROI",
  searchStyle: "Direct and concise",
  profile: {
    goals: ["Reduce spend"],
    painPoints: ["Unclear pricing"],
    currentStack: ["HubSpot"],
    buyingTriggers: ["Budget review"],
    objections: ["Long setup"],
  },
  conversationPrompts: ["Which tools have predictable pricing?"],
  enabled: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  memories: [],
};

function activity(
  points: GeoPersonaActivityResponse["points"]
): GeoPersonaActivityResponse {
  return {
    from: "2026-09-14",
    to: "2026-09-17",
    points,
  };
}

function point(
  snapshotVersion: string,
  day: string,
  mentions: number,
  checks = 2,
  lastCheckedAt = `${day}T12:00:00.000Z`
): GeoPersonaActivityResponse["points"][number] {
  return {
    personaId: persona.id,
    snapshotVersion,
    day,
    lastCheckedAt,
    checks,
    mentions,
  };
}

describe("persona activity versions", () => {
  test("preserves the existing rate for one version", () => {
    const data = activity([point("v1", "2026-09-16", 1)]);
    const series = buildPersonaActivitySeries(data, [persona]);

    expect(series).toHaveLength(1);
    expect(personaMentionRate(data, persona.id, "v1")).toBe(50);
  });

  test("renders different versions as disconnected series", () => {
    const data = activity([
      point("v1", "2026-09-14", 2),
      point("v2", "2026-09-16", 1),
    ]);
    const series = buildPersonaActivitySeries(data, [persona]);
    const rows = buildPersonaActivityRows(data, series, "2026-09-16");
    const oldKey = personaActivityKey(persona.id, "v1");
    const newKey = personaActivityKey(persona.id, "v2");

    expect(rows.find((row) => row.day === "2026-09-14")?.[oldKey]).toBe(100);
    expect(rows.find((row) => row.day === "2026-09-14")?.[newKey]).toBeNull();
    expect(rows.find((row) => row.day === "2026-09-16")?.[oldKey]).toBeNull();
    expect(rows.find((row) => row.day === "2026-09-16")?.[newKey]).toBe(50);
  });

  test("keeps two versions measured on the same day", () => {
    const data = activity([
      point("v1", "2026-09-16", 2, 2, "2026-09-16T09:00:00.000Z"),
      point("v2", "2026-09-16", 0, 2, "2026-09-16T14:00:00.000Z"),
    ]);
    const series = buildPersonaActivitySeries(data, [persona]);
    const row = buildPersonaActivityRows(data, series, "2026-09-16").find(
      (entry) => entry.day === "2026-09-16"
    );

    expect(row?.[personaActivityKey(persona.id, "v1")]).toBe(100);
    expect(row?.[personaActivityKey(persona.id, "v2")]).toBe(0);
  });

  test("selects the version with the latest check as current", () => {
    const data = activity([
      point("z-old", "2026-09-16", 2, 2, "2026-09-16T09:00:00.000Z"),
      point("a-new", "2026-09-16", 0, 2, "2026-09-16T14:00:00.000Z"),
    ]);
    const series = buildPersonaActivitySeries(data, [persona]);

    expect(series.find((item) => item.isCurrent)?.snapshotVersion).toBe(
      "a-new"
    );
  });

  test("excludes previous versions from the headline rate", () => {
    const data = activity([
      point("v1", "2026-09-15", 2),
      point("v2", "2026-09-16", 0),
    ]);

    expect(personaMentionRate(data, persona.id, "v2")).toBe(0);
  });

  test("builds the forecast from the current version only", () => {
    const data = activity([
      point("v1", "2026-09-15", 2),
      point("v2", "2026-09-16", 0),
    ]);
    const series = buildPersonaActivitySeries(data, [persona]);
    const rows = buildPersonaActivityRows(data, series, "2026-09-16");
    const forecastKey = personaForecastKey(persona.id, "v2");

    expect(rows.find((row) => row.day === "2026-09-17")?.[forecastKey]).toBe(0);
  });

  test("distinguishes zero mentions from an unobserved version day", () => {
    const data = activity([
      point("v1", "2026-09-15", 0),
      point("v2", "2026-09-16", 1),
    ]);
    const series = buildPersonaActivitySeries(data, [persona]);
    const rows = buildPersonaActivityRows(data, series, "2026-09-16");

    expect(
      rows.find((row) => row.day === "2026-09-15")?.[
        personaActivityKey(persona.id, "v1")
      ]
    ).toBe(0);
    expect(
      rows.find((row) => row.day === "2026-09-15")?.[
        personaActivityKey(persona.id, "v2")
      ]
    ).toBeNull();
  });
});
