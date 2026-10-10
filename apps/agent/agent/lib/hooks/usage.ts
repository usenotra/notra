import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { FEATURES } from "@notra/ai/billing/features";
import { calculateTokenCostUsd } from "@notra/ai/billing/token-pricing";
import { redis } from "@notra/ai/utils/redis";
import { logError } from "@notra/ai/utils/server-log";
import { toAgentTokenUsage } from "@notra/ai/utils/token-usage";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { captureServerEvent, flushPostHogServer } from "@notra/posthog/server";
import { getOrganizationId } from "@notra/tools/utils/organization";
import {
  getBooleanSessionAttribute,
  getSessionAttribute,
} from "@notra/tools/utils/session";
import {
  defineHook,
  type HookContext,
  type HookDefinition,
  type HookEvent,
} from "eve/hooks";

import {
  ACCUMULATE_USAGE_SCRIPT,
  MICRO_USD_PER_USD,
  USAGE_KEY_TTL_SECONDS,
} from "../constants/usage";
import type { AccumulatedUsage } from "../types/usage";

function accumulatorKey(sessionId: string, turnId: string) {
  return `agent:usage:acc:${sessionId}:${turnId}`;
}

async function trackUsage(
  modelId: string,
  organizationId: string,
  usage: AccumulatedUsage,
  properties: Record<string, string | number>
) {
  if (!autumn) {
    return;
  }
  const totalTokens =
    usage.inputTokens +
    usage.outputTokens +
    usage.cacheReadTokens +
    usage.cacheWriteTokens;
  if (totalTokens === 0 && !usage.costMicroUsd) {
    return;
  }
  const cost = calculateAiCreditCostCents(
    {
      ...usage,
      totalTokens,
      modelId,
      ...(usage.costMicroUsd === undefined
        ? {}
        : { tokenCostUsd: usage.costMicroUsd / MICRO_USD_PER_USD }),
    },
    modelId,
    properties.markup_applied === "true"
  );
  await autumn.track({
    customerId: organizationId,
    featureId: FEATURES.AI_CREDITS,
    value: cost.costCents,
    properties: {
      ...properties,
      model: modelId,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cache_read_tokens: usage.cacheReadTokens,
      cache_write_tokens: usage.cacheWriteTokens,
      cost_cents: cost.costCents,
    },
  });
  try {
    captureServerEvent({
      event: POSTHOG_EVENTS.AI_CREDITS_CHARGED,
      organizationId,
      properties: {
        cost_cents: cost.costCents,
        source: properties.source,
        model: modelId,
        billing_basis: cost.billingBasis,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        cache_read_tokens: usage.cacheReadTokens,
        cache_write_tokens: usage.cacheWriteTokens,
        total_tokens: totalTokens,
        agent: properties.agent,
        turn_id: properties.turn_id,
        markup_applied: properties.markup_applied === "true",
      },
    });
    await flushPostHogServer();
  } catch (error) {
    logError("[agent] Charged usage telemetry failed", error, {
      sessionId: properties.session_id,
      turnId: properties.turn_id,
    });
  }
}

function shouldChargeAiCredits(ctx: Parameters<typeof getSessionAttribute>[0]) {
  return getSessionAttribute(ctx, "chargeAiCredits") !== "false";
}

/** `modelId` may resolve per turn for agents whose model is chosen at runtime. */
export function createUsageHook(
  modelId: string | ((turnId: string) => string)
): HookDefinition {
  const resolveModelId = (turnId: string) =>
    typeof modelId === "string" ? modelId : modelId(turnId);

  async function settleTurn(
    event: HookEvent<"turn.completed" | "turn.failed" | "turn.cancelled">,
    ctx: HookContext
  ) {
    const key = accumulatorKey(ctx.session.id, event.data.turnId);
    const billedKey = `agent:usage:billed:${ctx.session.id}:${event.data.turnId}`;
    const billingKey = `${key}:billing`;
    let claimed = false;
    let trackingStarted = false;
    let charged = false;
    try {
      if (
        !redis ||
        !autumn ||
        allowUnmeteredAiInDevelopment ||
        !shouldChargeAiCredits(ctx)
      ) {
        return;
      }
      const organizationId = getOrganizationId(ctx);
      if (!organizationId) {
        return;
      }
      claimed =
        (await redis.set(billedKey, "1", {
          nx: true,
          ex: USAGE_KEY_TTL_SECONDS,
        })) === "OK";
      if (!claimed) {
        return;
      }
      if (await redis.exists(billingKey)) {
        await redis.persist(billingKey);
        logError("[agent] Usage billing reconciliation required", undefined, {
          sessionId: ctx.session.id,
          turnId: event.data.turnId,
          billingKey,
          reason: "pending_billing_record",
          automaticRetry: false,
        });
        return;
      }
      if (!(await redis.exists(key))) {
        await redis.del(billedKey);
        return;
      }
      await redis.rename(key, billingKey);
      // Keep evidence past the claim's TTL. There is no documented Autumn
      // idempotency contract: an interrupted/rejected track must be reconciled
      // manually, never automatically retried by another terminal event.
      // A durable reconciliation path remains outside this change; neither
      // this claim nor the pending record guarantees exactly-once billing.
      await redis.persist(billingKey);
      // Read the frozen hash, not a live snapshot from before RENAME. EVAL
      // ordered before RENAME is included; later EVAL retains a separate key.
      const accumulated =
        await redis.hgetall<Record<string, string>>(billingKey);
      if (!accumulated) {
        throw new Error("Frozen usage billing record is missing");
      }
      trackingStarted = true;
      await trackUsage(
        resolveModelId(event.data.turnId),
        organizationId,
        {
          inputTokens: Number(accumulated.inputTokens ?? 0),
          outputTokens: Number(accumulated.outputTokens ?? 0),
          cacheReadTokens: Number(accumulated.cacheReadTokens ?? 0),
          cacheWriteTokens: Number(accumulated.cacheWriteTokens ?? 0),
          // Old accumulators lack this field; a reported zero is not missing.
          costMicroUsd:
            accumulated.costMicroUsd === undefined
              ? undefined
              : Number(accumulated.costMicroUsd),
        },
        {
          source: getSessionAttribute(ctx, "surface") ?? "agent",
          agent: ctx.agent.name,
          session_id: ctx.session.id,
          turn_id: event.data.turnId,
          markup_applied: getBooleanSessionAttribute(ctx, "useMarkup")
            ? "true"
            : "false",
        }
      );
      charged = true;
      await redis.del(billingKey);
    } catch (error) {
      logError(
        trackingStarted && !charged
          ? "[agent] Usage billing reconciliation required"
          : "[agent] Usage metering failed",
        error,
        {
          sessionId: ctx.session.id,
          turnId: event.data.turnId,
          billingKey,
          charged,
          trackingStarted,
          automaticRetry: false,
        }
      );
      // Only pre-track failures are safe to release. Keeping the claim after
      // an ambiguous billing failure avoids replaying a possibly accepted charge.
      if (claimed && !trackingStarted) {
        await redis?.del(billedKey).catch(() => null);
      }
    }
  }

  return defineHook({
    events: {
      async "step.completed"(event, ctx) {
        try {
          if (allowUnmeteredAiInDevelopment || !shouldChargeAiCredits(ctx)) {
            return;
          }
          const organizationId = getOrganizationId(ctx);
          const usage = event.data.usage;
          if (!(organizationId && usage)) {
            return;
          }
          // eve reports the AI SDK counts, where the prompt total still
          // contains the cached tokens.
          const billable = toAgentTokenUsage(usage);
          const costUsd =
            typeof usage.costUsd === "number" &&
            Number.isFinite(usage.costUsd) &&
            usage.costUsd >= 0
              ? usage.costUsd
              : calculateTokenCostUsd(
                  billable,
                  resolveModelId(event.data.turnId)
                );
          const costMicroUsd = Math.round(costUsd * MICRO_USD_PER_USD);
          const stepUsage: AccumulatedUsage = {
            inputTokens: billable.inputTokens,
            outputTokens: billable.outputTokens,
            cacheReadTokens: billable.cacheReadTokens,
            cacheWriteTokens: billable.cacheWriteTokens,
            costMicroUsd,
          };

          if (!redis) {
            await trackUsage(
              resolveModelId(event.data.turnId),
              organizationId,
              stepUsage,
              {
                source: getSessionAttribute(ctx, "surface") ?? "agent",
                agent: ctx.agent.name,
                session_id: ctx.session.id,
                turn_id: event.data.turnId,
                step_index: event.data.stepIndex,
                markup_applied: getBooleanSessionAttribute(ctx, "useMarkup")
                  ? "true"
                  : "false",
              }
            );
            return;
          }

          const stepKey = `agent:usage:step:${ctx.session.id}:${event.data.turnId}:${event.data.stepIndex}`;
          const key = accumulatorKey(ctx.session.id, event.data.turnId);
          const accumulated = await redis.eval<number[], number>(
            ACCUMULATE_USAGE_SCRIPT,
            [
              stepKey,
              key,
              `${key}:billing`,
              `agent:usage:billed:${ctx.session.id}:${event.data.turnId}`,
            ],
            [
              stepUsage.inputTokens,
              stepUsage.outputTokens,
              stepUsage.cacheReadTokens,
              stepUsage.cacheWriteTokens,
              costMicroUsd,
              USAGE_KEY_TTL_SECONDS,
            ]
          );
          if (accumulated === 2) {
            logError(
              "[agent] Usage billing reconciliation required",
              undefined,
              {
                sessionId: ctx.session.id,
                turnId: event.data.turnId,
                billingKey: key,
                reason: "usage_during_or_after_settlement",
                automaticRetry: false,
              }
            );
          }
        } catch (error) {
          logError("[agent] Usage accumulation failed", error, {
            sessionId: ctx.session.id,
            turnId: event.data.turnId,
          });
        }
      },
      "turn.completed": settleTurn,
      "turn.failed": settleTurn,
      "turn.cancelled": settleTurn,
    },
  });
}
