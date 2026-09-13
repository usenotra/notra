import { describe, expect, test } from "bun:test";

import type { GeoTrafficSource } from "@notra/geo-core/types/geo";
import { formatGeoSource } from "@notra/geo-core/utils/ai-traffic";
import { resolveEngineIconKey } from "@notra/geo-core/utils/geo-engine-icon";

import {
  groupTrafficSources,
  resolveTrafficSourceBand,
} from "../src/utils/ai-traffic-groups";

function source(
  overrides: Pick<GeoTrafficSource, "source" | "visitorType" | "category"> &
    Partial<GeoTrafficSource>
): GeoTrafficSource {
  return {
    agent: overrides.source,
    confidence: "verified",
    visits: 1,
    markdownVisits: 0,
    paths: 1,
    lastSeenAt: "2026-09-12 00:00:00",
    ...overrides,
  };
}

describe("resolveTrafficSourceBand", () => {
  test("puts assistant-browse crawlers in the cited band", () => {
    expect(
      resolveTrafficSourceBand({
        visitorType: "crawler",
        category: "assistant-browse",
      })
    ).toBe("cited");
  });

  test("keeps training crawlers in the crawler band", () => {
    expect(
      resolveTrafficSourceBand({
        visitorType: "crawler",
        category: "training-crawler",
      })
    ).toBe("crawler");
  });
});

describe("groupTrafficSources", () => {
  test("shows cited Meta separately from Meta training crawlers", () => {
    const groups = groupTrafficSources([
      source({
        source: "meta-externalagent",
        visitorType: "crawler",
        category: "training-crawler",
        visits: 10,
      }),
      source({
        source: "meta-externalfetcher",
        visitorType: "crawler",
        category: "assistant-browse",
        visits: 4,
      }),
    ]);

    const crawler = groups.find((group) => group.band === "crawler");
    const cited = groups.find((group) => group.band === "cited");
    expect(crawler?.label).toBe("Meta");
    expect(crawler?.visits).toBe(10);
    expect(cited?.label).toBe("Meta");
    expect(cited?.visits).toBe(4);
  });

  test("shows Instagram as its own source, not Meta", () => {
    const groups = groupTrafficSources([
      source({
        source: "meta-externalfetcher",
        visitorType: "crawler",
        category: "assistant-browse",
        visits: 4,
      }),
      source({
        source: "Instagram",
        visitorType: "crawler",
        category: "assistant-browse",
        visits: 3,
      }),
      source({
        source: "instagram",
        visitorType: "ai_referral",
        category: "assistant-referral",
        visits: 2,
      }),
    ]);

    const cited = groups.filter((group) => group.band === "cited");
    const referrals = groups.filter((group) => group.band === "ai_referral");
    expect(cited.map((group) => group.label).toSorted()).toEqual([
      "Instagram",
      "Meta",
    ]);
    expect(referrals).toHaveLength(1);
    expect(referrals[0]?.label).toBe("Instagram");
  });
});

describe("Instagram source identity", () => {
  test("labels Instagram instead of falling back to the raw token", () => {
    expect(formatGeoSource("instagram")).toBe("Instagram");
    expect(formatGeoSource("Instagram")).toBe("Instagram");
  });

  test("does not resolve Instagram to the Meta icon family", () => {
    expect(resolveEngineIconKey("instagram")).toBe("instagram");
    expect(resolveEngineIconKey("Instagram")).toBe("instagram");
    expect(resolveEngineIconKey("meta-externalfetcher")).toBe("meta");
  });
});
