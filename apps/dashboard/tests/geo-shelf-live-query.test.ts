import { describe, expect, test } from "bun:test";

import type { GeoCompetitor } from "@notra/geo-core/types/geo";

import type { GeoShelfMember, GeoShelfSource } from "@/types/geo-shelf";
import {
  isShelfOpportunitySource,
  matchesGeoShelfSourceFilters,
  matchesShelfSourceFilter,
  matchesSourceSearch,
  matchesTicketSourceFilter,
} from "@/utils/geo-shelf-live-query";

const members: GeoShelfMember[] = [
  {
    id: "member-1",
    userId: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    image: null,
    role: "member",
  },
];

const competitors: GeoCompetitor[] = [
  {
    id: "competitor-1",
    name: "Rival Co",
    domain: "rival.example",
    synonyms: [],
    kind: "direct",
    color: null,
  },
];

const baseSource: GeoShelfSource = {
  id: "source-1",
  url: "https://example.com/best-tools",
  domain: "example.com",
  title: "Best AI tools",
  kind: "listicle",
  ownership: "third_party",
  origin: "scan",
  fetchStatus: "ok",
  lastFetchedAt: "2026-01-01T00:00:00.000Z",
  citations: {
    windowCount: 1,
    totalCount: 1,
    promptCount: 1,
    engines: ["chatgpt"],
    firstCitedAt: "2026-01-01T00:00:00.000Z",
    lastCitedAt: "2026-01-01T00:00:00.000Z",
  },
  placements: [
    {
      competitorId: null,
      brandName: "Notra",
      brandDomain: "notra.ai",
      status: "absent",
      position: null,
      hasLink: false,
      evidence: "manual",
      excerpt: null,
      checkedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      competitorId: "competitor-1",
      brandName: "Rival Co",
      brandDomain: "rival.example",
      status: "present",
      position: 1,
      hasLink: true,
      evidence: "manual",
      excerpt: null,
      checkedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  opportunity: {
    id: "ticket-1",
    status: "open",
    priority: "high",
    assigneeMemberId: "member-1",
    pocMemberId: null,
    notes: "Reach out to the editor",
    dueAt: null,
    createdByUserId: "user-1",
    resolvedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  createdByUserId: "user-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("geo shelf live query filters", () => {
  test("detects opportunity shelves", () => {
    expect(isShelfOpportunitySource(baseSource)).toBe(true);
  });

  test("matches shelf and ticket filters", () => {
    expect(matchesShelfSourceFilter(baseSource, "opportunities")).toBe(true);
    expect(matchesTicketSourceFilter(baseSource, "mine", "member-1")).toBe(
      true
    );
    expect(matchesTicketSourceFilter(baseSource, "unassigned", null)).toBe(
      false
    );
  });

  test("matches competitor names from the competitors collection in search", () => {
    expect(
      matchesSourceSearch(baseSource, "rival co", members, competitors)
    ).toBe(true);
    expect(matchesSourceSearch(baseSource, "notra", members, competitors)).toBe(
      false
    );
  });

  test("combines filters for the page query", () => {
    expect(
      matchesGeoShelfSourceFilters(
        baseSource,
        {
          search: "editor",
          shelf: "opportunities",
          ticket: "open",
          currentMemberId: "member-1",
        },
        members,
        competitors
      )
    ).toBe(true);

    expect(
      matchesGeoShelfSourceFilters(
        baseSource,
        {
          search: "",
          shelf: "on_shelf",
          ticket: "any",
          currentMemberId: null,
        },
        members,
        competitors
      )
    ).toBe(false);
  });
});
