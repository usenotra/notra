import { describe, expect, test } from "bun:test";

import type { GeoShelfSource } from "@/types/geo-shelf";
import {
  applyShelfOpportunityChanges,
  applyShelfPlacementStatus,
} from "@/utils/geo-shelf";
import {
  compareGeoShelfSources,
  countGeoShelfBoardColumns,
} from "@/utils/geo-shelf-live-query";
import {
  resolveSelectedShelfSource,
  toGeoShelfSortState,
} from "@/utils/geo-shelf-page";

const NOW = "2026-01-01T00:00:00.000Z";

function source(overrides: Partial<GeoShelfSource>): GeoShelfSource {
  return {
    id: "source-1",
    url: "https://example.com/best-tools",
    domain: "example.com",
    title: "Best AI tools",
    kind: "listicle",
    ownership: "third_party",
    origin: "scan",
    fetchStatus: "ok",
    lastFetchedAt: NOW,
    citations: {
      windowCount: 1,
      totalCount: 1,
      promptCount: 1,
      engines: ["chatgpt"],
      firstCitedAt: NOW,
      lastCitedAt: NOW,
    },
    placements: [
      {
        competitorId: null,
        brandName: "Notra",
        brandDomain: "notra.ai",
        status: "absent",
        position: null,
        hasLink: false,
        evidence: "fetch",
        excerpt: null,
        checkedAt: NOW,
      },
      {
        competitorId: "competitor-1",
        brandName: "Rival Co",
        brandDomain: "rival.example",
        status: "present",
        position: 2,
        hasLink: true,
        evidence: "fetch",
        excerpt: null,
        checkedAt: NOW,
      },
    ],
    opportunity: null,
    createdByUserId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function withWindowCount(id: string, windowCount: number): GeoShelfSource {
  const base = source({ id });
  return { ...base, citations: { ...base.citations, windowCount } };
}

describe("geo shelf paging helpers", () => {
  test("falls back to the default sort when the table clears it", () => {
    expect(toGeoShelfSortState(null)).toEqual({
      key: "citations",
      direction: "desc",
    });
    expect(
      toGeoShelfSortState({ key: "competitors", direction: "asc" })
    ).toEqual({ key: "citations", direction: "desc" });
    expect(toGeoShelfSortState({ key: "title", direction: "asc" })).toEqual({
      key: "title",
      direction: "asc",
    });
  });

  test("prefers the loaded row and keeps the snapshot once it is filtered out", () => {
    const snapshot = source({ title: "Snapshot" });
    const loaded = source({ title: "Loaded" });
    const swapped = source({ id: "server-id", title: "Created" });

    expect(resolveSelectedShelfSource([loaded], snapshot)).toBe(loaded);
    expect(resolveSelectedShelfSource([swapped], snapshot)).toBe(swapped);
    expect(resolveSelectedShelfSource([], snapshot)).toBe(snapshot);
    expect(resolveSelectedShelfSource([loaded], null)).toBeNull();
  });

  test("marking a brand as missing clears its position and link", () => {
    const next = applyShelfPlacementStatus(
      source({}),
      "competitor-1",
      "absent",
      "2026-02-01T00:00:00.000Z"
    );
    const competitor = next.placements.find(
      (placement) => placement.competitorId === "competitor-1"
    );

    expect(competitor).toMatchObject({
      status: "absent",
      position: null,
      hasLink: false,
      evidence: "manual",
    });
    expect(next.placements[0]).toEqual(source({}).placements[0]);
  });

  test("sorts like the page query, ties broken by id", () => {
    const sources = [
      withWindowCount("b", 3),
      withWindowCount("c", 9),
      withWindowCount("a", 3),
    ];
    const ids = sources
      .sort((left, right) =>
        compareGeoShelfSources(left, right, {
          key: "citations",
          direction: "desc",
        })
      )
      .map((entry) => entry.id);

    expect(ids).toEqual(["c", "a", "b"]);
  });

  test("counts board columns by ticket status", () => {
    const open = source({
      id: "open",
      opportunity: {
        id: "ticket-1",
        status: "open",
        priority: null,
        assigneeMemberId: null,
        pocMemberId: null,
        notes: null,
        dueAt: null,
        createdByUserId: null,
        resolvedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });

    expect(countGeoShelfBoardColumns([open, source({ id: "none" })])).toEqual({
      untracked: 1,
      open: 1,
      in_progress: 0,
      won: 0,
      lost: 0,
      dismissed: 0,
    });
  });

  test("drops a point of contact equal to the assignee, like the server", () => {
    const next = applyShelfOpportunityChanges(
      source({}),
      { assigneeMemberId: "member-1" },
      NOW
    );
    const withPoc = applyShelfOpportunityChanges(
      next,
      { pocMemberId: "member-1" },
      NOW
    );

    expect(withPoc.opportunity).toMatchObject({
      assigneeMemberId: "member-1",
      pocMemberId: null,
    });
  });
});
