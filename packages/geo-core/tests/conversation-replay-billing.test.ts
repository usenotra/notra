import "./utils/infrastructure";
import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";

import { Effect } from "effect";

import { GEO_PERSONA_BILLING_MULTIPLIER } from "../src/constants/geo-personas";
import { GeoContentBillingService } from "../src/deps";
import type { FinalizeContentBillingInput } from "../src/types/content-billing";
import type { GeoConversationResult } from "../src/types/geo-conversations";
import { EMPTY_AGENT_TOKEN_USAGE } from "../src/utils/token-usage";
import { testBillingGate } from "./constants/geo-boundaries";
import {
  database,
  initializeDatabase,
  resetDatabase,
  seedProject,
} from "./utils/database";

const { runGeoConversationReplay } =
  await import("../src/geo/conversation-replay");

beforeAll(initializeDatabase, 30_000);
afterAll(() => database.postgres.close());
beforeEach(resetDatabase);

test.each([undefined, GEO_PERSONA_BILLING_MULTIPLIER])(
  "a replay confirms its answers and usage times the multiplier (%s)",
  async (billingMultiplier) => {
    const scope = await seedProject("replay-billing");
    const usage = {
      ...EMPTY_AGENT_TOKEN_USAGE,
      inputTokens: 10,
      totalTokens: 10,
      totalUsd: 0.5,
    };
    const finalized: FinalizeContentBillingInput[] = [];
    const result = await Effect.runPromise(
      runGeoConversationReplay(
        {
          context: {
            runId: "replay-run",
            organizationId: scope.organizationId,
            projectId: scope.projectId,
            catalog: { providers: [], models: [] },
            companyName: "Notra",
            aliases: [],
            websiteUrl: null,
            domains: [],
          },
          fallbackModelId: "test/model",
          properties: { source: "test" },
          logPrefix: "Test",
          emptyMessage: "empty",
          ...(billingMultiplier ? { billingMultiplier } : {}),
        },
        (context): Effect.Effect<readonly GeoConversationResult[]> =>
          Effect.succeed([
            {
              usage,
              rows: [1, 2].map((turn) => ({
                organizationId: context.organizationId,
                projectId: context.projectId,
                scanId: context.scanId,
                engine: "test/engine",
                promptId: "persona-test",
                turn,
                prompt: `question ${turn}`,
                answer: "Notra is great.",
                mentioned: true,
                ownedSourceCited: false,
                position: 1,
                sentiment: "positive",
                competitors: [],
                excerpt: "Notra",
                grounding: { queries: [], sources: [] },
                language: "en",
                finishReason: "stop",
                promptTokens: null,
                outputTokens: null,
                reasoningTokens: null,
                capturedAt: context.capturedAt,
              })),
            },
          ])
      ).pipe(
        Effect.provideService(GeoContentBillingService, {
          gateContentBilling: () => Effect.succeed(testBillingGate),
          finalizeContentBilling: (input) =>
            Effect.sync(() => {
              finalized.push(input);
            }),
        })
      )
    );

    const multiplier = billingMultiplier ?? 1;
    expect(result.checks).toBe(2);
    expect(finalized).toHaveLength(1);
    expect(finalized[0]).toMatchObject({
      action: "confirm",
      units: 2 * multiplier,
      usage: expect.objectContaining({
        inputTokens: 10 * multiplier,
        totalUsd: 0.5 * multiplier,
      }),
    });
  }
);
