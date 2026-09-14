import { describeContentBillingDenial } from "@notra/ai/billing/content-billing";
import { FEATURES } from "@notra/ai/billing/features";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { GeoCheckInsertSummary } from "@notra/db/types/geo-checks";
import { insertGeoMentionChecksWithSummary } from "@notra/db/utils/geo-checks";
import { Effect } from "effect";

import { GeoContentBillingService } from "../deps";
import type { GeoCheckContext } from "../types/geo";
import type {
  GeoConversationReplayInput,
  GeoConversationResult,
} from "../types/geo-conversations";
import { logGeoBillingFailure } from "../utils/geo-billing-log";
import {
  addAgentTokenUsage,
  EMPTY_AGENT_TOKEN_USAGE,
} from "../utils/token-usage";
import { geoSkip } from "./effect";
import { GeoScanError, GeoWriterCreditsExhaustedError } from "./errors";
import {
  claimGeoScanRun,
  releaseGeoScanRun,
  withGeoScanRun,
} from "./scan-status";

/** A manual replay has its own bill and results, but never covers a scheduled scan. */
export const runGeoConversationReplay = Effect.fn("geo.runConversationReplay")(
  function* <R>(
    input: GeoConversationReplayInput,
    play: (
      context: GeoCheckContext
    ) => Effect.Effect<readonly (GeoConversationResult | null)[], never, R>
  ) {
    const billing = yield* GeoContentBillingService;
    const { organizationId, projectId, runId } = input.context;
    const gate = yield* billing
      .gateContentBilling({
        organizationId,
        executionId: runId,
        outputType: null,
        quotaFeatureId: FEATURES.AI_ANSWERS,
      })
      .pipe(
        Effect.mapError(
          (cause) =>
            new GeoScanError({ message: "Failed to reserve AI credits", cause })
        )
      );
    if (!gate.allowed) {
      return yield* Effect.fail(
        new GeoWriterCreditsExhaustedError({
          message: describeContentBillingDenial(gate),
        })
      );
    }
    const settle = (
      action: "confirm" | "release",
      units = 0,
      usage?: AgentTokenUsage
    ) =>
      billing
        .finalizeContentBilling({
          reservation: gate,
          action,
          units,
          usage,
          fallbackModelId: input.fallbackModelId,
          properties: {
            ...input.properties,
            run_id: runId,
            markup_applied: gate.useMarkup,
          },
          logPrefix: input.logPrefix,
        })
        .pipe(
          Effect.catch((error) =>
            Effect.sync(() =>
              logGeoBillingFailure(action, projectId, runId, error)
            )
          )
        );

    let result: (GeoConversationResult & GeoCheckInsertSummary) | undefined;
    let emptyUsage: AgentTokenUsage | undefined;
    return yield* Effect.gen(function* () {
      const claim = yield* claimGeoScanRun(projectId).pipe(
        geoSkip("scan claim failed")
      );
      result = yield* withGeoScanRun(
        { organizationId, projectId },
        (scanId) =>
          Effect.gen(function* () {
            const outcomes = yield* play({
              ...input.context,
              scanId,
              capturedAt: new Date(),
            });
            const rows = outcomes.flatMap((outcome) => outcome?.rows ?? []);
            const usage = outcomes.reduce(
              (total, outcome) =>
                outcome ? addAgentTokenUsage(total, outcome.usage) : total,
              EMPTY_AGENT_TOKEN_USAGE
            );
            if (rows.length === 0) {
              emptyUsage = usage;
              return yield* Effect.fail(
                new GeoScanError({ message: input.emptyMessage })
              );
            }
            const inserted = yield* Effect.tryPromise({
              try: () => insertGeoMentionChecksWithSummary(rows),
              catch: (cause) =>
                new GeoScanError({
                  message: "Failed to store conversation results",
                  cause,
                }),
            });
            return { rows, usage, ...inserted };
          }),
        claim
          ? {
              claimedAt: claim.claimedAt,
              finishStatusStamp: releaseGeoScanRun(
                projectId,
                claim.claimedAt
              ).pipe(geoSkip("scan claim release failed")),
            }
          : { skipStatusStamps: true }
      );
      return result;
    }).pipe(
      Effect.ensuring(
        Effect.suspend(() => {
          if (result) {
            return settle("confirm", result.checks, result.usage);
          }
          if (emptyUsage) {
            return settle("confirm", 0, emptyUsage);
          }
          return settle("release");
        })
      )
    );
  }
);
