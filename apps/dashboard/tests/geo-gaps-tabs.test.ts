import { expect, test } from "bun:test";

import type {
  GeoAiSearchGapRow,
  GeoSearchGapRow,
} from "@notra/geo-core/types/geo";

import {
  filterUnifiedSearchGaps,
  primarySearchQuery,
  searchGapAiDraft,
  searchGapDemandRank,
  unifySearchGaps,
} from "../src/utils/geo-gaps";

test("the same query from Search Console and AI appears once", () => {
  const consoleGap: GeoSearchGapRow = {
    id: "console-1",
    prompt: "Compare content platforms",
    title: null,
    impressions: 128,
    clicks: 3,
    position: 9,
    queries: [
      {
        query: "AI content generation platform comparison",
        clicks: 3,
        impressions: 128,
        position: 9,
      },
    ],
    brief: null,
    recommendation: { action: "create", reason: "No page", targets: [] },
  };
  const aiGap: GeoAiSearchGapRow = {
    id: "ai-1",
    query: "best AI content generation platform comparison",
    variants: [],
    prompts: ["AI-specific discovery"],
    engines: ["openai/gpt-5.4-grounded"],
    searches: 2,
    ownMentionRate: 0,
    competitors: [],
    discoveredCompetitors: [],
    opportunity: 1,
    brief: null,
  };

  expect(unifySearchGaps([consoleGap], [aiGap])).toEqual([
    { kind: "console", row: consoleGap, ai: aiGap },
  ]);
  expect(primarySearchQuery(consoleGap)).toBe(
    "AI content generation platform comparison"
  );
  expect(
    searchGapDemandRank({ kind: "console", row: consoleGap, ai: aiGap })
  ).toBeGreaterThan(
    searchGapDemandRank({ kind: "console", row: consoleGap, ai: null })
  );
  expect(
    searchGapAiDraft({ kind: "console", row: consoleGap, ai: aiGap })
  ).toBeNull();
  const aiWithBrief = {
    ...aiGap,
    brief: {
      briefId: "brief-ai",
      status: "draft" as const,
      postId: null,
      workingTitle: "AI content tools",
      publishedAt: null,
      baseline: null,
      rescanned: false,
    },
  };
  // Console actions stay; the AI-only draft is offered next to them.
  expect(
    searchGapAiDraft({ kind: "console", row: consoleGap, ai: aiWithBrief })
  ).toBe(aiWithBrief);
  expect(
    searchGapAiDraft({
      kind: "console",
      row: {
        ...consoleGap,
        brief: { ...aiWithBrief.brief, briefId: "brief-console" },
      },
      ai: aiWithBrief,
    })
  ).toBeNull();
  expect(searchGapAiDraft({ kind: "ai", row: aiWithBrief })).toBeNull();
  expect(
    filterUnifiedSearchGaps(unifySearchGaps([consoleGap], [aiGap]), "Compare")
  ).toEqual([{ kind: "console", row: consoleGap, ai: aiGap }]);
  expect(
    filterUnifiedSearchGaps(
      unifySearchGaps([consoleGap], [aiGap]),
      "AI-specific discovery"
    )
  ).toEqual([{ kind: "console", row: consoleGap, ai: aiGap }]);
  expect(
    unifySearchGaps(
      [
        {
          ...consoleGap,
          queries: consoleGap.queries.map((keyword) => ({
            ...keyword,
            query: "AI content tools 2026",
          })),
        },
      ],
      [{ ...aiGap, query: "best AI content tools 2025" }]
    )
  ).toHaveLength(1);
});
