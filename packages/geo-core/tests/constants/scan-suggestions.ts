import type { GeoContentBrief } from "@notra/ai/types/geo-writer";

import type { ScanSuggestionCheck } from "../../src/types/scan-suggestions";

export const SCAN_CHECK: ScanSuggestionCheck = {
  id: "check",
  scanId: "scan",
  engine: "openai/gpt-5",
  promptId: "origin",
  prompt: "Which database works best for serverless applications?",
  answer: "Compare pooling, cost and available regions.",
  grounding: {
    queries: ["serverless postgres connection pooling comparison"],
    sources: [
      {
        url: "https://example.org/review",
        title: "Database review",
        domain: "example.org",
      },
    ],
  },
  capturedAt: new Date(),
  language: "English",
};

export const SCAN_BRIEF: GeoContentBrief = {
  targetPrompt: SCAN_CHECK.grounding.queries[0] ?? "",
  intent: "Compare connection pooling",
  contentSubtype: "guide",
  workingTitle: "Serverless Postgres Connection Pooling",
  audience: "Developers",
  jobToBeDone: "Choose a pooling approach",
  sections: [
    { heading: "Compare pooling", goal: "Explain tradeoffs", claims: [] },
  ],
  questionsToAnswer: ["How does pooling work?"],
  internalLinks: [],
  acceptanceChecklist: ["Explain tradeoffs"],
};
