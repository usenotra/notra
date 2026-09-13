import { describe, expect, test } from "bun:test";

import {
  normalizeOverviewResponse,
  normalizePromptResultsResponse,
  normalizeVisibilityMetrics,
} from "../src/utils/geo-visibility";

describe("geo-visibility", () => {
  test("fills missing visibility metrics from mentions", () => {
    expect(
      normalizeVisibilityMetrics({
        mentions: 4,
        mentionRate: 0.4,
      })
    ).toEqual({
      mentions: 4,
      mentionRate: 0.4,
      citations: 0,
      visibility: 4,
      visibilityRate: 0.4,
    });

    expect(
      normalizeOverviewResponse({
        configured: true,
        engines: [
          {
            engine: "openai",
            checks: 10,
            mentions: 5,
            mentionRate: 0.5,
            avgPosition: 1,
            lastCheckedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }).engines[0]
    ).toMatchObject({
      citations: 0,
      visibility: 5,
      visibilityRate: 0.5,
    });
  });

  test("defaults ownedSourceCited to false in prompt results", () => {
    const normalized = normalizePromptResultsResponse({
      configured: true,
      results: [
        {
          promptId: "prompt-1",
          engine: "openai",
          prompt: "Who is Acme?",
          answer: "Acme builds widgets.",
          mentioned: true,
          position: 1,
          sentiment: "positive",
          competitors: ["Globex"],
          excerpt: "Acme builds widgets.",
          searchQueries: [],
          sources: [],
          lastCheckedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(normalized.results[0]?.ownedSourceCited).toBe(false);
  });
});
