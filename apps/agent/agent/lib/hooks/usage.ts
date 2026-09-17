import { calculateAiCreditCostCents } from "@notra/ai/billing/ai-credit-cost";
import {
  allowUnmeteredAiInDevelopment,
  autumn,
} from "@notra/ai/billing/autumn";
import { FEATURES } from "@notra/ai/billing/features";
import { redis } from "@notra/ai/utils/redis";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { captureServerEvent, flushPostHogServer } from "@notra/posthog/server";
import { getOrganizationId } from "@notra/tools/utils/organization";
import {
  getBooleanSessionAttribute,
  getSessionAttribute,
} from "@notra/tools/utils/session";
import { defineHook, type HookDefinition } from "eve/hooks";

const USAGE_KEY_TTL_SECONDS = 60 * 60 * 24;

interface AccumulatedUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

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
  if (totalTokens === 0) {
    return;
  }
  const cost = calculateAiCreditCostCents(
    { ...usage, totalTokens, modelId },
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
          const stepUsage: AccumulatedUsage = {
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
            cacheReadTokens: usage.cacheReadTokens ?? 0,
            cacheWriteTokens: usage.cacheWriteTokens ?? 0,
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
          const claimed = await redis.set(stepKey, "1", {
            nx: true,
            ex: USAGE_KEY_TTL_SECONDS,
          });
          if (claimed !== "OK") {
            return;
          }
          const key = accumulatorKey(ctx.session.id, event.data.turnId);
          await Promise.all([
            redis.hincrby(key, "inputTokens", stepUsage.inputTokens),
            redis.hincrby(key, "outputTokens", stepUsage.outputTokens),
            redis.hincrby(key, "cacheReadTokens", stepUsage.cacheReadTokens),
            redis.hincrby(key, "cacheWriteTokens", stepUsage.cacheWriteTokens),
            redis.expire(key, USAGE_KEY_TTL_SECONDS),
          ]);
        } catch (error) {
          console.error("[agent] Usage accumulation failed", error);
        }
      },
      async "turn.completed"(event, ctx) {
        let charged = false;
        try {
          if (
            !redis ||
            allowUnmeteredAiInDevelopment ||
            !shouldChargeAiCredits(ctx)
          ) {
            return;
          }
          const organizationId = getOrganizationId(ctx);
          if (!organizationId) {
            return;
          }
          const billedKey = `agent:usage:billed:${ctx.session.id}:${event.data.turnId}`;
          const claimed = await redis.set(billedKey, "1", {
            nx: true,
            ex: USAGE_KEY_TTL_SECONDS,
          });
          if (claimed !== "OK") {
            return;
          }
          const key = accumulatorKey(ctx.session.id, event.data.turnId);
          const billingKey = `${key}:billing`;
          try {
            await redis.rename(key, billingKey);
          } catch {
            return;
          }
          const accumulated =
            await redis.hgetall<Record<string, string>>(billingKey);
          if (!accumulated) {
            return;
          }
          await trackUsage(
            resolveModelId(event.data.turnId),
            organizationId,
            {
              inputTokens: Number(accumulated.inputTokens ?? 0),
              outputTokens: Number(accumulated.outputTokens ?? 0),
              cacheReadTokens: Number(accumulated.cacheReadTokens ?? 0),
              cacheWriteTokens: Number(accumulated.cacheWriteTokens ?? 0),
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
          console.error("[agent] Usage metering failed", error);
          if (!charged) {
            await redis
              ?.del(`agent:usage:billed:${ctx.session.id}:${event.data.turnId}`)
              .catch(() => null);
          }
        }
      },
    },
  });
}
