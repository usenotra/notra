import { describe, expect, test } from "bun:test";

import {
  normalizeLanguageShareResponse,
  normalizeOverviewResponse,
  normalizePromptResultsResponse,
  normalizeTimeseriesResponse,
  normalizeVisibilityMetrics,
} from "../src/utils/geo-visibility";

describe("normalizeVisibilityMetrics", () => {
  test("fills missing citations and visibility fields from mentions", () => {
    const normalized = normalizeVisibilityMetrics({
      mentions: 4,
      mentionRate: 0.4,
    });

    expect(normalized).toEqual({
      mentions: 4,
      mentionRate: 0.4,
      citations: 0,
      visibility: 4,
      visibilityRate: 0.4,
    });
  });

  test("preserves explicit visibility metrics", () => {
    const normalized = normalizeVisibilityMetrics({
      mentions: 4,
      mentionRate: 0.4,
      citations: 2,
      visibility: 3,
      visibilityRate: 0.3,
    });

    expect(normalized.citations).toBe(2);
    expect(normalized.visibility).toBe(3);
    expect(normalized.visibilityRate).toBe(0.3);
  });
});

describe("normalizeOverviewResponse", () => {
  test("normalizes every engine row", () => {
    const normalized = normalizeOverviewResponse({
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
    });

    expect(normalized.engines[0]).toMatchObject({
      citations: 0,
      visibility: 5,
      visibilityRate: 0.5,
    });
  });
});

describe("normalizeTimeseriesResponse", () => {
  test("normalizes every timeseries point", () => {
    const normalized = normalizeTimeseriesResponse({
      configured: true,
      points: [
        {
          day: "2026-01-01",
          engine: "openai",
          checks: 2,
          mentions: 1,
        },
      ],
    });

    expect(normalized.points[0]).toEqual({
      day: "2026-01-01",
      engine: "openai",
      checks: 2,
      mentions: 1,
      citations: 0,
      visibility: 1,
    });
  });
});

describe("normalizePromptResultsResponse", () => {
  test("defaults ownedSourceCited to false", () => {
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

describe("normalizeLanguageShareResponse", () => {
  test("normalizes every language row", () => {
    const normalized = normalizeLanguageShareResponse({
      configured: true,
      points: [
        {
          language: "en",
          checks: 8,
          mentions: 2,
          mentionRate: 0.25,
          avgPosition: 2,
        },
      ],
    });

    expect(normalized.points[0]).toMatchObject({
      citations: 0,
      visibility: 2,
      visibilityRate: 0.25,
    });
  });
});
