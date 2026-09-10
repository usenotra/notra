import type { GeoPromptHistoryCheck } from "@notra/geo-core/types/geo";

import type { GeoPromptTableRow } from "../../src/types/geo";

export const promptAnswerRow: GeoPromptTableRow = {
  id: "prompt",
  prompt: "Which product should I choose?",
  enabled: true,
  source: "custom",
  tags: [],
  intent: "comparison",
  mentioned: 0,
  total: 1,
  bestPosition: null,
  presence: null,
  results: [
    {
      promptId: "prompt",
      prompt: "Which product should I choose?",
      engine: "openai/gpt-4o-mini",
      checkId: "unscoped-latest-answer",
      mentioned: false,
      position: null,
      sentiment: null,
      competitors: [],
      lastCheckedAt: "2026-09-09T12:00:00.000Z",
    },
  ],
};

export const scopedAnswer: GeoPromptHistoryCheck = {
  id: "scoped-answer",
  scanId: "selected-scan",
  engine: "anthropic/claude-sonnet-4",
  language: "German",
  mentioned: false,
  position: null,
  sentiment: null,
  competitors: [],
  answer: "Eine Antwort.",
  excerpt: "Eine Antwort.",
  searchQueries: [],
  sources: [],
  capturedAt: "2026-09-08T12:00:00.000Z",
};
