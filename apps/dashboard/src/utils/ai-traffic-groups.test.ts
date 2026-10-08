import { expect, test } from "bun:test";

import { classifyVisitor } from "@notra/geo-core/ingest/classify-visitor";
import type { GeoTrafficSource } from "@notra/geo-core/types/geo";
import {
  toGeoTrafficPreviousTotals,
  trafficVisitDelta,
} from "@notra/geo-core/utils/ai-traffic";

import {
  buildTrafficGroupSeries,
  groupTrafficSources,
  trafficGroupCurrentMembers,
  trafficGroupPathsAreLowerBound,
  trafficGroupPreviousVisits,
  trafficGroupPurposeTotals,
} from "./ai-traffic-groups";

function source(
  agent: string,
  visits: number,
  previousVisits: number,
  paths: number
): GeoTrafficSource {
  return {
    ...classifyVisitor({
      userAgent: agent,
      referer: undefined,
      accept: undefined,
    }),
    visits,
    previousVisits,
    paths,
    markdownVisits: 0,
    lastSeenAt: "2026-10-07 12:00:00",
  };
}

test("vanished members remain in comparisons but not current bot counts or purposes", () => {
  const sources = [
    source("GPTBot", 0, 100, 0),
    source("OAI-SearchBot", 10, 0, 1),
  ];
  const [group] = groupTrafficSources(sources);
  expect(group).toBeDefined();
  if (!group) {
    throw new Error("Expected current OpenAI group");
  }
  expect(toGeoTrafficPreviousTotals(sources)?.crawler).toBe(100);
  expect(group.members).toHaveLength(2);
  const previousVisits = trafficGroupPreviousVisits(group);
  expect(previousVisits).toBe(100);
  if (previousVisits === null) {
    throw new Error("Expected comparison visits");
  }
  expect(trafficVisitDelta(group.visits, previousVisits)).toBe(-90);
  expect(
    trafficGroupCurrentMembers(group).map((member) => member.source)
  ).toEqual(["OAI-SearchBot"]);
  expect(group.categories).toEqual(["search-index"]);
  expect(trafficGroupPurposeTotals(group)).toEqual([
    { category: "search-index", visits: 10, members: ["OAI-SearchBot"] },
  ]);
  expect(trafficGroupPathsAreLowerBound(group)).toBe(false);
});

test("historical-only providers and cited bands do not create visible groups", () => {
  const sources = [
    source("GPTBot", 0, 100, 0),
    source("ChatGPT-User", 0, 20, 0),
  ];
  expect(groupTrafficSources(sources)).toEqual([]);
  expect(toGeoTrafficPreviousTotals(sources)?.crawler).toBe(120);
  expect(toGeoTrafficPreviousTotals(sources)?.cited).toBe(20);
  const groups = groupTrafficSources([
    ...sources,
    source("ClaudeBot", 10, 0, 1),
  ]);
  expect(groups).toHaveLength(1);
  const [group] = groups;
  if (!group) {
    throw new Error("Expected current Claude group");
  }
  expect(group.band).toBe("crawler");
  expect(
    trafficGroupCurrentMembers(group).map((member) => member.source)
  ).toEqual(["ClaudeBot"]);
});

test("multiple active bots expose a path lower bound for both disjoint and overlapping sets", () => {
  const firstPaths = ["/a", "/b", "/c"];
  for (const secondPaths of [
    ["/d", "/e", "/f", "/g"],
    ["/a", "/b", "/c", "/d"],
  ]) {
    const [group] = groupTrafficSources([
      source("GPTBot", 3, 0, firstPaths.length),
      source("OAI-SearchBot", 4, 0, secondPaths.length),
    ]);
    if (!group) {
      throw new Error("Expected OpenAI group");
    }
    const actualUnion = new Set([...firstPaths, ...secondPaths]).size;
    expect(group.paths).toBe(4);
    expect(group.paths).toBeLessThanOrEqual(actualUnion);
    expect(trafficGroupPathsAreLowerBound(group)).toBe(true);
    expect(group.paths).not.toBe(firstPaths.length + secondPaths.length);
  }
});

test("real crawler and cited agent IDs keep independent trends", () => {
  const sources = [
    source("GPTBot", 70, 0, 2),
    source("ChatGPT-User", 30, 0, 1),
  ];
  const groups = groupTrafficSources(sources);
  const points = sources.map((member) => ({
    day: "2026-10-07",
    source: member.source,
    visitorType: member.visitorType,
    visits: member.visits,
  }));
  const crawler = groups.find((group) => group.band === "crawler");
  const cited = groups.find((group) => group.band === "cited");
  if (!(crawler && cited)) {
    throw new Error("Expected crawler and cited groups");
  }
  expect(buildTrafficGroupSeries(points, crawler, ["2026-10-07"])).toEqual([
    70,
  ]);
  expect(buildTrafficGroupSeries(points, cited, ["2026-10-07"])).toEqual([30]);
});
