import type { ContentBillingReservation } from "@notra/ai/types/billing";
import { Effect } from "effect";

import type { AgentReadinessNetworkShape } from "../../src/types/agent-readiness";
import type { GeoModelServiceShape } from "../../src/types/model";

export const readinessNetwork: AgentReadinessNetworkShape = {
  report: () =>
    Effect.succeed({
      score: 80,
      scoreLabel: "Ready",
      scoreBreakdown: null,
      issues: [],
      eligibleChecks: 10,
      reportUrl: null,
      scannedAt: new Date("2026-09-08T00:00:00Z"),
    }),
  scan: () => Effect.void,
  feedback: () => Effect.succeed(null),
};

export const testBillingGate: ContentBillingReservation = {
  allowed: true,
  mode: "unmetered",
  featureId: null,
  reserved: false,
  lockId: null,
  useMarkup: false,
};

export const testFeatureFlags = {
  isCursorEngineEnabledForOrganization: () => Effect.succeed(false),
  isOpenCodeEngineEnabledForOrganization: () => Effect.succeed(false),
};

export const fakeModels: GeoModelServiceShape = {
  answer: () =>
    Effect.succeed({
      text: "The selected brand is a good choice.",
      grounding: { queries: [], sources: [] },
      sources: [],
      finishReason: "stop",
      zdrEnforced: null,
    }),
  groundedAnswer: () => Effect.die("Unexpected grounded request"),
  judge: () =>
    Effect.succeed({
      mentioned: true,
      position: 1,
      sentiment: "positive",
      competitors: [],
      excerpt: "selected brand",
    }),
  translate: () => Effect.die("Unexpected translation"),
  suggest: () =>
    Effect.succeed([
      {
        prompt: "What are the best tools for sending email?",
        title: "Email tools",
        keywords: ["email tools"],
      },
    ]),
};
