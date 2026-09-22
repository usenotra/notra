import { describe, expect, test } from "bun:test";

import type { GeoJourneyEvent } from "@notra/geo-core/types/geo";

import type { GeoJourneyTreeNode } from "@/types/geo";
import {
  buildJourneyOverview,
  buildJourneyPathTree,
  countJourneyBranches,
  formatJourneyDepth,
  journeySeries,
  journeyTrendDays,
} from "@/utils/geo-journey";

function event(path: string, referer = ""): GeoJourneyEvent {
  return {
    capturedAt: "2026-09-16 10:00:00",
    path,
    host: "example.com",
    method: "GET",
    referer,
    country: "US",
    agent: "Applebot",
    category: "crawler",
  };
}

function shape(nodes: GeoJourneyTreeNode[]): unknown[] {
  return nodes.map((node) =>
    node.children.length > 0 ? { [node.path]: shape(node.children) } : node.path
  );
}

describe("buildJourneyPathTree", () => {
  test("chains new pages off the page fetched before them", () => {
    const tree = buildJourneyPathTree([
      event("/"),
      event("/pricing"),
      event("/contact"),
    ]);
    expect(shape(tree)).toEqual([{ "/": [{ "/pricing": ["/contact"] }] }]);
  });

  test("branches when the agent returns to an earlier page", () => {
    const tree = buildJourneyPathTree([
      event("/"),
      event("/pricing"),
      event("/"),
      event("/docs"),
    ]);
    expect(shape(tree)).toEqual([{ "/": ["/pricing", "/docs"] }]);
    expect(tree[0]?.hits).toBe(2);
    expect(countJourneyBranches(tree)).toBe(1);
  });

  test("hangs pages off the visited section they live under", () => {
    const tree = buildJourneyPathTree([
      event("/docs"),
      event("/docs/setup"),
      event("/docs/api"),
    ]);
    expect(shape(tree)).toEqual([{ "/docs": ["/docs/setup", "/docs/api"] }]);
  });

  test("prefers a same-site referer over fetch order", () => {
    const tree = buildJourneyPathTree([
      event("/"),
      event("/blog"),
      event("/pricing", "https://www.example.com/"),
    ]);
    expect(shape(tree)).toEqual([{ "/": ["/blog", "/pricing"] }]);
  });
});

describe("buildJourneyOverview", () => {
  test("counts a page once per journey", () => {
    const overview = buildJourneyOverview([
      {
        journeyId: "a",
        source: "Applebot",
        visitorType: "crawler",
        pages: 3,
        distinctPaths: 2,
        firstSeenAt: "2026-09-16 10:00:00",
        lastSeenAt: "2026-09-16 10:01:00",
        entryPath: "/",
        samplePaths: ["/", "/pricing", "/"],
      },
    ]);
    expect(overview.paths.find((row) => row.path === "/")?.journeys).toBe(1);
  });
});

describe("journey trends", () => {
  test("fills every day between the first and last journey", () => {
    const days = journeyTrendDays([
      { daily: [{ day: "2026-09-01", journeys: 2 }] },
      { daily: [{ day: "2026-09-04", journeys: 1 }] },
    ]);
    expect(days).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
    ]);
    expect(
      journeySeries([{ day: "2026-09-04", journeys: 1 }], days).map(
        (point) => point.value
      )
    ).toEqual([0, 0, 0, 1]);
  });

  test("formats average depth", () => {
    expect(formatJourneyDepth(7, 2)).toBe("3.5 pages");
    expect(formatJourneyDepth(0, 0)).toBe("0 pages");
  });
});
