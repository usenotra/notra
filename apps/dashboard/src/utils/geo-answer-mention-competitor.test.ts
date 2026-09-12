import { describe, expect, test } from "bun:test";

import type { GeoCompetitor } from "@notra/geo-core/types/geo";

import { findMentionedCompetitor } from "./geo-answer-mention-competitor";

function competitor(
  overrides: Pick<GeoCompetitor, "id" | "name"> &
    Partial<Omit<GeoCompetitor, "id" | "name">>
): GeoCompetitor {
  return {
    domain: null,
    synonyms: [],
    kind: "direct",
    color: null,
    ...overrides,
  };
}

describe("findMentionedCompetitor", () => {
  test("prefers a canonical name over an earlier competitor's synonym", () => {
    const synonymOwner = competitor({
      id: "seo-tool",
      name: "Ahrefs",
      synonyms: ["HubSpot"],
    });
    const canonical = competitor({
      id: "hubspot",
      name: "HubSpot",
      domain: "hubspot.com",
    });

    expect(
      findMentionedCompetitor([synonymOwner, canonical], "HubSpot")?.id
    ).toBe("hubspot");
  });

  test("falls back to the first synonym owner when no canonical matches", () => {
    const first = competitor({
      id: "semrush",
      name: "Semrush",
      synonyms: ["SEO Hub"],
    });
    const second = competitor({
      id: "ahrefs",
      name: "Ahrefs",
      synonyms: ["SEO Hub"],
    });

    expect(findMentionedCompetitor([first, second], "SEO Hub")?.id).toBe(
      "semrush"
    );
  });

  test("returns undefined for an empty phrase", () => {
    expect(findMentionedCompetitor([], "   ")).toBeUndefined();
  });
});
