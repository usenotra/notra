import { describe, expect, test } from "bun:test";

import type { GeoCompetitor, GeoScanCheckSnapshot } from "../src/types/geo";
import { diffScanChecks, summarizeGeoChanges } from "../src/utils/geo-changes";

function snapshot(
  overrides: Partial<GeoScanCheckSnapshot> = {}
): GeoScanCheckSnapshot {
  return {
    promptId: "prompt-1",
    prompt: "best tool for changelogs",
    engine: "claude",
    mentioned: false,
    ownedSourceCited: false,
    position: null,
    competitors: [],
    domains: [],
    ...overrides,
  };
}

const RIVAL: GeoCompetitor = {
  id: "competitor-1",
  name: "Rival",
  domain: "https://www.rival.com",
  synonyms: [],
  kind: "direct",
  color: null,
};

describe("diffScanChecks citations", () => {
  test("ignores third-party source churn", () => {
    const events = diffScanChecks(
      [snapshot({ domains: ["bestcadpapers.com"] })],
      [snapshot({ domains: ["eesel.ai"] })],
      [RIVAL]
    );
    expect(events).toEqual([]);
  });

  test("reports owned pages gaining and losing citations once per prompt", () => {
    const gained = diffScanChecks(
      [snapshot()],
      [snapshot({ ownedSourceCited: true, domains: ["a.com", "b.com"] })]
    );
    const lost = diffScanChecks(
      [snapshot({ ownedSourceCited: true })],
      [snapshot()]
    );
    expect(gained.map((event) => event.kind)).toEqual(["citation_added"]);
    expect(lost.map((event) => event.kind)).toEqual(["citation_removed"]);
    expect(summarizeGeoChanges([...gained, ...lost])).toMatchObject({
      citationsAdded: 1,
      citationsRemoved: 1,
    });
  });

  test("reports newly cited tracked competitors, including subdomains", () => {
    const events = diffScanChecks(
      [snapshot({ domains: ["rival.com"] })],
      [snapshot({ domains: ["rival.com", "blog.rival.com", "notrival.com"] })],
      [RIVAL]
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "competitor_cited",
      competitors: ["Rival"],
      domains: ["blog.rival.com"],
    });
  });

  test("attributes overlapping domains to the most specific competitor", () => {
    const cloud: GeoCompetitor = {
      ...RIVAL,
      id: "competitor-2",
      name: "Rival Cloud",
      domain: "cloud.rival.com",
    };
    const events = diffScanChecks(
      [snapshot()],
      [snapshot({ domains: ["docs.cloud.rival.com"] })],
      [RIVAL, cloud]
    );
    expect(events[0]?.competitors).toEqual(["Rival Cloud"]);
  });
});
