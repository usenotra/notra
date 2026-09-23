import { getEvaluationClient } from "@notra/ai/evaluation/client";
import { gateway, getRouteMetadata } from "@notra/ai/gateway";
import { generateText, isStepCount, Output } from "ai";
import { Effect, Layer } from "effect";

import {
  GEO_ANSWER_MAX_TOKENS,
  GEO_ANSWER_SYSTEM_PROMPT,
  GEO_ANSWER_TIMEOUT_MS,
  GEO_DIRECT_GROUNDED_PROVIDERS,
  GEO_DISCOVERY_SYSTEM_PROMPT,
  GEO_GROUNDED_ANSWER_MAX_TOKENS,
  GEO_JUDGE_MAX_TOKENS,
  GEO_JUDGE_MODEL,
  GEO_MENTION_EVALUATION_FEATURE,
  GEO_MENTION_EVALUATION_TIMEOUT_MS,
  GEO_PROVIDER_TIMEOUT_MS,
  GEO_TRANSLATION_MAX_TOKENS,
} from "../constants/geo";
import {
  GSC_SUGGESTION_MAX_TOKENS,
  GSC_SUGGESTION_MODEL,
} from "../constants/google-search-console";
import { GeoModelService } from "../deps";
import {
  geoJudgeResultSchema,
  geoTranslationResultSchema,
} from "../schemas/geo";
import { geoSearchConsoleSuggestionSchema } from "../schemas/google-search-console";
import { GeoModelError } from "../schemas/model-errors";
import type { GeoModelTokenUsage } from "../types/token-usage";
import {
  buildMentionEvaluationState,
  MENTION_EVALUATION_QUESTIONS,
  toMentionEvaluation,
} from "../utils/geo-check-evaluation";
import { addLanguageModelTokenUsage } from "../utils/token-usage";
import { buildGroundedInvocation } from "./engines";
import { GeoJudgeError, GeoScanError, GeoTranslationError } from "./errors";
import { extractGrounding } from "./grounding";
import { buildGscSuggestionPrompt } from "./suggestion-prompt";

function usageWithModel(
  usage: GeoModelTokenUsage,
  modelId: string
): GeoModelTokenUsage {
  return { ...usage, modelId: usage.modelId ?? modelId };
}

/** Retains SDK default retries; no additional Effect retry policy. */
export const geoModelLive = Layer.succeed(
  GeoModelService,
  GeoModelService.of({
    answer: Effect.fn("GeoModel.answer")((input) =>
      Effect.tryPromise({
        try: async (signal) => {
          const model = gateway(input.engine, {
            organizationId: input.organizationId,
            zdr: input.zdr,
            gateway: input.gateway,
          });
          const options = {
            prompt: input.prompt,
            instructions: GEO_ANSWER_SYSTEM_PROMPT,
            maxOutputTokens: GEO_ANSWER_MAX_TOKENS,
            abortSignal: signal,
            providerOptions: { gateway: { tags: ["geo-scan-plain"] } },
          };
          let result = await generateText({ model, ...options });
          let usage = result.usage;
          // Reasoning engines can spend the entire output budget on thought
          // and return no text at all; retry once at low effort.
          if (result.finishReason === "length" && !result.text.trim()) {
            const retry = await generateText({
              model,
              ...options,
              reasoning: "low",
            });
            usage = addLanguageModelTokenUsage(usage, retry.usage);
            result = retry;
          }
          return {
            text: result.text,
            grounding: extractGrounding(result),
            sources: collectSources(result.sources),
            finishReason: result.finishReason,
            usage: usageWithModel(usage, input.engine),
            zdrEnforced:
              getRouteMetadata(result.finalStep.providerMetadata)
                ?.zdrEnforced ?? null,
          };
        },
        catch: (cause) =>
          new GeoScanError({
            message: `Engine ${input.engine} failed to answer`,
            cause,
          }),
      }).pipe(
        Effect.timeoutOrElse({
          duration: GEO_ANSWER_TIMEOUT_MS,
          orElse: () =>
            Effect.fail(
              new GeoScanError({
                message: `Engine ${input.engine} timed out after ${GEO_ANSWER_TIMEOUT_MS}ms`,
                timedOut: true,
              })
            ),
        })
      )
    ),
    groundedAnswer: Effect.fn("GeoModel.groundedAnswer")((input) =>
      Effect.tryPromise({
        try: async (signal) => {
          const invocation = buildGroundedInvocation(input.engine, {
            organizationId: input.organizationId,
            zdr: input.zdr,
          });
          const result = await generateText({
            model: invocation.model,
            tools: invocation.tools,
            stopWhen: isStepCount(4),
            messages: input.messages,
            instructions: GEO_ANSWER_SYSTEM_PROMPT,
            maxOutputTokens: GEO_GROUNDED_ANSWER_MAX_TOKENS,
            abortSignal: signal,
            providerOptions: { gateway: { tags: ["geo-scan-grounded"] } },
          });
          const grounding = extractGrounding(result);
          const sources = collectSources(result.sources);
          return {
            text: result.text,
            grounding,
            finishReason: result.finishReason,
            sources: sources.length
              ? sources
              : grounding.sources.map(({ title, url }) => ({ title, url })),
            usage: usageWithModel(result.usage, input.engine.key),
            zdrEnforced: GEO_DIRECT_GROUNDED_PROVIDERS.has(
              input.engine.provider
            )
              ? false
              : (getRouteMetadata(result.finalStep.providerMetadata)
                  ?.zdrEnforced ?? null),
          };
        },
        catch: (cause) =>
          new GeoScanError({
            message: `Grounded engine ${input.engine.key} failed to answer`,
            cause,
          }),
      }).pipe(
        Effect.timeoutOrElse({
          duration: GEO_ANSWER_TIMEOUT_MS,
          orElse: () =>
            Effect.fail(
              new GeoScanError({
                message: `Grounded engine ${input.engine.key} timed out after ${GEO_ANSWER_TIMEOUT_MS}ms`,
                timedOut: true,
              })
            ),
        })
      )
    ),
    judge: Effect.fn("GeoModel.judge")((input) =>
      Effect.tryPromise({
        try: async (signal) => {
          const result = await generateText({
            model: gateway(GEO_JUDGE_MODEL, {
              organizationId: input.organizationId,
            }),
            output: Output.object({ schema: geoJudgeResultSchema }),
            prompt: input.prompt,
            instructions:
              "You analyze AI assistant answers for brand mentions. Respond only with the requested structured data.",
            maxOutputTokens: GEO_JUDGE_MAX_TOKENS,
            abortSignal: signal,
            providerOptions: { gateway: { tags: ["geo-scan-judge"] } },
          });
          return {
            ...result.output,
            usage: usageWithModel(result.usage, GEO_JUDGE_MODEL),
          };
        },
        catch: (cause) =>
          new GeoJudgeError({ message: "Judge model failed", cause }),
      }).pipe(
        Effect.timeoutOrElse({
          duration: GEO_PROVIDER_TIMEOUT_MS,
          orElse: () =>
            Effect.fail(
              new GeoJudgeError({
                message: `Judge model timed out after ${GEO_PROVIDER_TIMEOUT_MS}ms`,
                timedOut: true,
                cause: new Error("Judge model request timed out"),
              })
            ),
        })
      )
    ),
    evaluateMention: Effect.fn("GeoModel.evaluateMention")((input) =>
      Effect.promise(async (signal) => {
        const result = await getEvaluationClient().tryEvaluate({
          feature: GEO_MENTION_EVALUATION_FEATURE,
          organizationId: input.organizationId,
          state: buildMentionEvaluationState(input),
          questions: MENTION_EVALUATION_QUESTIONS,
          timeoutMs: GEO_MENTION_EVALUATION_TIMEOUT_MS,
          abortSignal: signal,
        });
        return result ? toMentionEvaluation(result) : null;
      })
    ),
    translate: Effect.fn("GeoModel.translate")((input) =>
      Effect.tryPromise({
        try: async (signal) => {
          const result = await generateText({
            model: gateway(GEO_JUDGE_MODEL, {
              organizationId: input.organizationId,
            }),
            output: Output.object({ schema: geoTranslationResultSchema }),
            prompt: `Translate each prompt into ${input.language}. Keep brand and product names unchanged. Return the translations in the same order.\n\n${JSON.stringify(input.prompts)}`,
            instructions:
              "You translate user prompts faithfully, preserving intent and named entities. Respond only with the requested structured data.",
            maxOutputTokens: GEO_TRANSLATION_MAX_TOKENS,
            abortSignal: signal,
            providerOptions: { gateway: { tags: ["geo-scan-translation"] } },
          });
          return {
            translations: result.output.translations,
            usage: usageWithModel(result.usage, GEO_JUDGE_MODEL),
          };
        },
        catch: (cause) =>
          new GeoTranslationError({
            message: `Translation to ${input.language} failed`,
            language: input.language,
            cause,
          }),
      }).pipe(
        Effect.timeoutOrElse({
          duration: GEO_PROVIDER_TIMEOUT_MS,
          orElse: () =>
            Effect.fail(
              new GeoTranslationError({
                message: `Translation to ${input.language} timed out after ${GEO_PROVIDER_TIMEOUT_MS}ms`,
                language: input.language,
              })
            ),
        })
      )
    ),
    suggest: Effect.fn("GeoModel.suggest")((input) =>
      Effect.tryPromise({
        try: async (signal) => {
          const result = await generateText({
            model: gateway(GSC_SUGGESTION_MODEL, {}),
            output: Output.object({
              schema: geoSearchConsoleSuggestionSchema,
            }),
            instructions: GEO_DISCOVERY_SYSTEM_PROMPT,
            prompt: buildGscSuggestionPrompt(input),
            maxOutputTokens: GSC_SUGGESTION_MAX_TOKENS,
            abortSignal: signal,
            providerOptions: { gateway: { tags: ["geo-discovery"] } },
          });
          return {
            prompts: result.output.prompts,
            usage: usageWithModel(result.usage, GSC_SUGGESTION_MODEL),
          };
        },
        catch: (cause) => new GeoModelError({ operation: "suggest", cause }),
      })
    ),
  })
);

function collectSources(
  sources: Awaited<ReturnType<typeof generateText>>["sources"]
) {
  const seen = new Set<string>();
  return sources.flatMap((source) => {
    if (source.sourceType !== "url" || seen.has(source.url)) {
      return [];
    }
    seen.add(source.url);
    return [{ url: source.url, title: source.title ?? null }];
  });
}
