import { describe, expect, test } from "bun:test";

import type { GeoJourneyEvent } from "@notra/geo-core/types/geo";

import type { GeoJourneyTreeNode } from "@/types/geo";
import {
  buildJourneyOverview,
  buildJourneyPathTree,
  countJourneyBranches,
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
        samplePaths: ["/", "/pricing", "/"],
      },
    ]);
    expect(overview.paths.find((row) => row.path === "/")?.journeys).toBe(1);
  });
});
