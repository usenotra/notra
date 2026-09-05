import {
  askGeoOpenCode,
  askGeoOpenCodeConversation,
} from "@notra/ai/agents/geo-opencode";
import { describeContentBillingDenial } from "@notra/ai/billing/content-billing";
import { FEATURES } from "@notra/ai/billing/features";
import { DEFAULT_LANGUAGE } from "@notra/ai/constants/languages";
import { geoLog } from "@notra/ai/evlog";
import { gateway, getRouteMetadata } from "@notra/ai/gateway";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import { EMPTY_GEO_CHECK_GROUNDING } from "@notra/db/constants/geo-checks";
import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  geoPersonas,
  geoPromptSequences,
  geoPrompts,
  geoSettings,
} from "@notra/db/schema";
import type {
  GeoCheckSourceItem,
  GeoCheckWrite,
} from "@notra/db/types/geo-checks";
import { insertGeoMentionChecks } from "@notra/db/utils/geo-checks";
import { generateText, type ModelMessage, Output, stepCountIs } from "ai";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_ANSWER_MAX_TOKENS,
  GEO_ANSWER_SYSTEM_PROMPT,
  GEO_ANSWER_TIMEOUT_MS,
  GEO_CURSOR_TIMEOUT_MS,
  GEO_DIRECT_GROUNDED_PROVIDERS,
  GEO_EXCERPT_MAX_LENGTH,
  GEO_GROUNDED_ANSWER_MAX_TOKENS,
  GEO_GROUNDED_MAX_PROMPTS,
  GEO_JUDGE_MAX_TOKENS,
  GEO_JUDGE_MODEL,
  GEO_LANGUAGE_GROUNDED_MAX_PROMPTS,
  GEO_LANGUAGE_MAX_PROMPTS,
  GEO_MAX_LANGUAGES,
  GEO_MAX_PROMPTS,
  GEO_MAX_SEQUENCES,
  GEO_OPENCODE_ANSWER_SYSTEM_PROMPT,
  GEO_OPENCODE_ENGINE_ID,
  GEO_PROVIDER_TIMEOUT_MS,
  GEO_SCAN_CONCURRENCY,
  GEO_SCAN_CLAIM_RENEW_AFTER_MS,
  GEO_SEQUENCE_PAIR_TIMEOUT_MS,
  GEO_SEQUENCE_MAX_TURNS,
  GEO_TRANSLATION_MAX_TOKENS,
} from "../constants/geo";
import { GEO_PERSONA_MAX_COUNT } from "../constants/geo-personas";
import { GeoContentBillingService } from "../deps";
import {
  geoJudgeResultSchema,
  geoTranslationResultSchema,
} from "../schemas/geo";
import type {
  GeoCheckContext,
  GeoCheckOutcome,
  GeoCheckTask,
  GeoEngineAnswer,
  GeoGroundedAnswer,
  GeoGroundedEngine,
  GeoModelGateway,
  GeoPromptDefinition,
  GeoScanBatchOutcome,
  GeoScanPlannedPersona,
  GeoScanPlannedSequence,
  GeoScanPlannedTask,
  GeoScanProjectContext,
  GeoScanProjectPlan,
  GeoScanProjectPlanResult,
  GeoScanProjectTotals,
  GeoScopeInput,
  GeoSequenceCheckOutcome,
  GeoSequenceDefinition,
  GeoSequenceRunResponse,
  GeoSettingsRow,
  GeoSkipFields,
  GeoZdrMode,
} from "../types/geo";
import {
  resolveGeoEngineGateway,
  resolveGeoGroundedZdrMode,
  resolveGeoZdrMode,
} from "../utils/geo-engines";
import {
  resolveGroundedEngineByKey,
  resolveGroundedEngines,
} from "../utils/geo-grounded-engines";
import {
  describeGeoError,
  flushGeoLogEffect,
  geoLogError,
  geoLogInfo,
  geoLogWarn,
  logGeoSkip,
} from "../utils/geo-log";
import {
  isGeoScanRunning,
  summarizeGeoEngineAttempts,
} from "../utils/geo-scan";
import { askCursorEngine } from "./cursor";
import { geoSkip } from "./effect";
import { buildGroundedInvocation } from "./engines";
import {
  GeoEmptyAnswerError,
  GeoJudgeError,
  GeoScanError,
  GeoSequenceEmptyError,
  GeoSequenceNotFoundError,
  GeoSequenceRunError,
  GeoSequenceRunUnavailableError,
  GeoSettingsMissingError,
  GeoTranslationError,
  GeoWriterCreditsExhaustedError,
} from "./errors";
import { extractGrounding } from "./grounding";
import { toGeoSettings } from "./mappers";
import { loadGeoModelCatalog } from "./model-catalog";
import { requireGeoProject } from "./projects";
import {
  buildGeoPrompts,
  customPromptScanId,
  scopeGeoPrompts,
} from "./prompts";
import {
  claimGeoScanRun,
  createGeoScanRow,
  failPendingGeoScanRow,
  finishGeoScanRow,
  markGeoScanFinished,
  releaseGeoScanRun,
  renewGeoScanRun,
  withGeoScanRun,
} from "./scan-status";
import { resolveScanZdrPolicy } from "./zdr-policy";

export const MAX_JUDGE_COMPETITORS = 10;
const GROUNDED_MAX_STEPS = 4;

function sequencePromptId(sequenceId: string): string {
  return `sequence-${sequenceId}`;
}

function sequenceTurnCount(sequence: GeoSequenceDefinition): number {
  return Math.min(sequence.steps.length, GEO_SEQUENCE_MAX_TURNS);
}

function checkFailureFields(
  context: GeoCheckContext,
  task: GeoCheckTask
): GeoSkipFields {
  return {
    event: "geo.check.failed",
    organizationId: context.organizationId,
    projectId: context.projectId,
    scanId: context.scanId,
    engine: task.engine,
    promptId: task.prompt.id,
    language: task.language,
    grounded: task.grounded !== null,
  };
}

function sequenceFailureFields(
  context: GeoCheckContext,
  sequence: GeoSequenceDefinition,
  engine: string,
  grounded: boolean
): GeoSkipFields {
  return {
    event: "geo.check.failed",
    organizationId: context.organizationId,
    projectId: context.projectId,
    scanId: context.scanId,
    engine,
    promptId: sequencePromptId(sequence.id),
    sequenceId: sequence.id,
    language: DEFAULT_LANGUAGE,
    grounded,
  };
}

function droppedCheckOutcome(
  fields: GeoSkipFields,
  error: GeoEmptyAnswerError
): GeoCheckOutcome {
  logGeoSkip("check failed", fields, error);
  return {
    row: null,
    usage: error.usage
      ? addTokenUsage(EMPTY_TOKEN_USAGE, error.usage)
      : EMPTY_TOKEN_USAGE,
  };
}

/**
 * Rotates the claim token only once it has aged past the renew threshold.
 * Batches call this on entry, and a workflow step can be retried with the
 * token its crashed predecessor already rotated away — renewing on every
 * batch would turn each such retry into a lost claim. Under the threshold the
 * incoming token is still comfortably inside `GEO_SCAN_STALE_MS`, so handing
 * it back unchanged is safe.
 */
export const renewGeoScanClaimIfDue = Effect.fn("geo.renewScanClaimIfDue")(
  function* (projectId: string, claimedAt: Date) {
    if (Date.now() - claimedAt.getTime() < GEO_SCAN_CLAIM_RENEW_AFTER_MS) {
      return claimedAt;
    }
    const renewed = yield* renewGeoScanRun(projectId, claimedAt);
    if (!renewed) {
      return yield* Effect.fail(
        new GeoScanError({
          message: `Lost the scan claim for project ${projectId}`,
        })
      );
    }
    return renewed.claimedAt;
  }
);

export function normalizePosition(position: number | null): number | null {
  if (position === null || !Number.isFinite(position)) {
    return null;
  }
  const rounded = Math.round(position);
  return rounded >= 1 ? rounded : null;
}

function buildJudgePrompt(
  context: GeoCheckContext,
  promptText: string,
  answer: string
): string {
  const aliasList =
    context.aliases.length > 0 ? context.aliases.join(", ") : "none";
  return `Company: ${context.companyName}
Known aliases (any of these counts as a mention): ${aliasList}

A user asked an AI assistant:
"""
${promptText}
"""

The assistant answered:
"""
${answer}
"""

Analyze the answer and report:
- mentioned: true if the company or any alias appears in the answer.
- position: the 1-based rank of the company among the recommended brands if the answer contains an ordered or bulleted list of brands, otherwise null.
- sentiment: the sentiment expressed toward the company ("positive", "neutral" or "negative"), or null if it is not mentioned.
- competitors: up to ${MAX_JUDGE_COMPETITORS} other brand or product names mentioned in the answer, excluding the company and its aliases.
- excerpt: at most ${GEO_EXCERPT_MAX_LENGTH} characters of the answer around the mention, or the first 200 characters of the answer if the company is not mentioned.

The answer may be written in any language or script; count mentions of the company or its aliases regardless of language.`;
}

const askGatewayEngine = Effect.fn("geo.askGatewayEngine")(function* (
  organizationId: string,
  engine: string,
  promptText: string,
  zdr: GeoZdrMode,
  gatewayPin: Exclude<GeoModelGateway, "cursor" | "box"> | undefined
) {
  const result = yield* Effect.tryPromise({
    try: (signal) =>
      generateText({
        model: gateway(engine, {
          organizationId,
          zdr,
          gateway: gatewayPin,
        }),
        prompt: promptText,
        system: GEO_ANSWER_SYSTEM_PROMPT,
        maxOutputTokens: GEO_ANSWER_MAX_TOKENS,
        abortSignal: signal,
      }),
    catch: (cause) =>
      new GeoScanError({
        message: `Engine ${engine} failed to answer`,
        cause,
      }),
  }).pipe(
    Effect.timeoutOrElse({
      duration: GEO_ANSWER_TIMEOUT_MS,
      orElse: () =>
        Effect.fail(
          new GeoScanError({
            message: `Engine ${engine} timed out after ${GEO_ANSWER_TIMEOUT_MS}ms`,
            timedOut: true,
          })
        ),
    })
  );
  const answer: GeoEngineAnswer = {
    text: result.text,
    grounding: extractGrounding(result),
    sources: collectGroundedSources(result.sources),
    finishReason: result.finishReason,
    usage: result.usage,
    zdrEnforced: getRouteMetadata(result.providerMetadata)?.zdrEnforced ?? null,
  };
  return answer;
});

const askOpenCodeEngineEffect = Effect.fn("geo.askOpenCodeEngine")(function* (
  engine: string,
  promptText: string
) {
  const deadlineAtMs = Date.now() + GEO_ANSWER_TIMEOUT_MS;
  let openCodePromise: ReturnType<typeof askGeoOpenCode> | null = null;
  const result = yield* Effect.tryPromise({
    try: (signal) => {
      openCodePromise = askGeoOpenCode(
        `${GEO_OPENCODE_ANSWER_SYSTEM_PROMPT}\n\nUser question:\n${promptText}`,
        signal,
        deadlineAtMs
      );
      return openCodePromise;
    },
    catch: (cause) =>
      new GeoScanError({
        message: `Engine ${engine} failed to answer`,
        cause,
      }),
  }).pipe(
    Effect.ensuring(
      Effect.uninterruptible(
        Effect.promise(
          () =>
            openCodePromise?.then(
              () => undefined,
              () => undefined
            ) ?? Promise.resolve()
        )
      )
    ),
    Effect.timeoutOrElse({
      duration: Math.max(1, deadlineAtMs - Date.now()),
      orElse: () =>
        Effect.fail(
          new GeoScanError({
            message: `Engine ${engine} timed out after ${GEO_ANSWER_TIMEOUT_MS}ms`,
            timedOut: true,
          })
        ),
    })
  );
  const answer: GeoEngineAnswer = {
    text: result.text,
    grounding: extractGrounding(result),
    sources: result.sources,
    finishReason: "stop",
    usage: result.usage,
    zdrEnforced: false,
  };
  return answer;
});

/**
 * Cursor is not hosted on any AI gateway, so it runs through the local Cursor
 * SDK instead of `generateText`. Zero data retention is irrelevant here: the
 * catalog marks the engine as non-ZDR and approval is handled upstream.
 */
const askCursorEngineEffect = Effect.fn("geo.askCursorEngine")(function* (
  engine: string,
  promptText: string
) {
  const text = yield* askCursorEngine(promptText).pipe(
    Effect.mapError(
      (cause) =>
        new GeoScanError({
          message: `Engine ${engine} failed to answer`,
          cause,
        })
    ),
    Effect.timeoutOrElse({
      duration: GEO_CURSOR_TIMEOUT_MS,
      orElse: () =>
        Effect.fail(
          new GeoScanError({
            message: `Engine ${engine} timed out after ${GEO_CURSOR_TIMEOUT_MS}ms`,
            timedOut: true,
          })
        ),
    })
  );
  const answer: GeoEngineAnswer = {
    text,
    grounding: EMPTY_GEO_CHECK_GROUNDING,
    sources: [],
    finishReason: null,
    zdrEnforced: false,
  };
  return answer;
});

const askEngine = Effect.fn("geo.askEngine")(function* (
  organizationId: string,
  engine: string,
  promptText: string,
  zdr: GeoZdrMode,
  gatewayPin: GeoModelGateway | undefined
) {
  if (gatewayPin === "cursor") {
    return yield* askCursorEngineEffect(engine, promptText);
  }
  if (gatewayPin === "box") {
    return yield* askOpenCodeEngineEffect(engine, promptText);
  }
  return yield* askGatewayEngine(
    organizationId,
    engine,
    promptText,
    zdr,
    gatewayPin
  );
});

function collectGroundedSources(
  sources: Awaited<ReturnType<typeof generateText>>["sources"]
): GeoCheckSourceItem[] {
  const seen = new Set<string>();
  const collected: GeoCheckSourceItem[] = [];
  for (const source of sources) {
    if (source.sourceType !== "url" || seen.has(source.url)) {
      continue;
    }
    seen.add(source.url);
    collected.push({ url: source.url, title: source.title ?? null });
  }
  return collected;
}

export const askGroundedConversation = Effect.fn("geo.askGroundedConversation")(
  function* (
    organizationId: string,
    engine: GeoGroundedEngine,
    messages: ModelMessage[],
    zdr: GeoZdrMode
  ) {
    const result = yield* Effect.tryPromise({
      try: (signal) => {
        const invocation = buildGroundedInvocation(engine, {
          organizationId,
          zdr,
        });
        return generateText({
          model: invocation.model,
          tools: invocation.tools,
          stopWhen: stepCountIs(GROUNDED_MAX_STEPS),
          messages,
          system: GEO_ANSWER_SYSTEM_PROMPT,
          maxOutputTokens: GEO_GROUNDED_ANSWER_MAX_TOKENS,
          abortSignal: signal,
        });
      },
      catch: (cause) =>
        new GeoScanError({
          message: `Grounded engine ${engine.key} failed to answer`,
          cause,
        }),
    }).pipe(
      Effect.timeoutOrElse({
        duration: GEO_ANSWER_TIMEOUT_MS,
        orElse: () =>
          Effect.fail(
            new GeoScanError({
              message: `Grounded engine ${engine.key} timed out after ${GEO_ANSWER_TIMEOUT_MS}ms`,
              timedOut: true,
            })
          ),
      })
    );
    const grounding = extractGrounding(result);
    const resultSources = collectGroundedSources(result.sources);
    const answer: GeoGroundedAnswer = {
      text: result.text,
      grounding,
      finishReason: result.finishReason,
      sources:
        resultSources.length > 0
          ? resultSources
          : grounding.sources.map(({ title, url }) => ({ title, url })),
      usage: result.usage,
      zdrEnforced: GEO_DIRECT_GROUNDED_PROVIDERS.has(engine.provider)
        ? false
        : (getRouteMetadata(result.providerMetadata)?.zdrEnforced ?? null),
    };
    return answer;
  }
);

export const judgeAnswer = Effect.fn("geo.judgeAnswer")(function* (
  context: GeoCheckContext,
  promptText: string,
  answer: string
) {
  const judged = yield* Effect.tryPromise({
    try: async (signal) => {
      const result = await generateText({
        model: gateway(GEO_JUDGE_MODEL, {
          organizationId: context.organizationId,
        }),
        output: Output.object({ schema: geoJudgeResultSchema }),
        prompt: buildJudgePrompt(context, promptText, answer),
        system:
          "You analyze AI assistant answers for brand mentions. Respond only with the requested structured data.",
        maxOutputTokens: GEO_JUDGE_MAX_TOKENS,
        abortSignal: signal,
      });
      return result.output;
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
  );
  return judged;
});

const translatePrompts = Effect.fn("geo.translatePrompts")(function* (
  organizationId: string,
  language: string,
  prompts: GeoPromptDefinition[]
) {
  const translations = yield* Effect.tryPromise({
    try: async (signal) => {
      const result = await generateText({
        model: gateway(GEO_JUDGE_MODEL, {
          organizationId,
        }),
        output: Output.object({ schema: geoTranslationResultSchema }),
        prompt: `Translate each prompt into ${language}. Keep brand and product names unchanged. Return the translations in the same order.\n\n${JSON.stringify(prompts.map((prompt) => prompt.text))}`,
        system:
          "You translate user prompts faithfully, preserving intent and named entities. Respond only with the requested structured data.",
        maxOutputTokens: GEO_TRANSLATION_MAX_TOKENS,
        abortSignal: signal,
      });
      return result.output.translations;
    },
    catch: (cause) =>
      new GeoTranslationError({
        message: `Translation to ${language} failed`,
        language,
        cause,
      }),
  }).pipe(
    Effect.timeoutOrElse({
      duration: GEO_PROVIDER_TIMEOUT_MS,
      orElse: () =>
        Effect.fail(
          new GeoTranslationError({
            message: `Translation to ${language} timed out after ${GEO_PROVIDER_TIMEOUT_MS}ms`,
            language,
          })
        ),
    })
  );
  if (translations.length !== prompts.length) {
    return yield* Effect.fail(
      new GeoTranslationError({
        message: `Translation to ${language} returned ${translations.length} prompts, expected ${prompts.length}`,
        language,
      })
    );
  }
  return prompts.map((prompt, index) => ({
    id: prompt.id,
    text: translations[index] ?? prompt.text,
  }));
});

export const requireAnswerText = Effect.fn("geo.requireAnswerText")(function* (
  engine: string,
  promptId: string,
  language: string,
  answer: GeoEngineAnswer
) {
  if (answer.text.trim().length > 0) {
    return answer.text;
  }
  return yield* Effect.fail(
    new GeoEmptyAnswerError({
      message: `Engine ${engine} returned an empty answer`,
      engine,
      promptId,
      language,
      finishReason: answer.finishReason,
      usage: answer.usage,
    })
  );
});

const runGeoCheck = Effect.fn("geo.runCheck")(function* (
  context: GeoCheckContext,
  task: GeoCheckTask
) {
  const grounded = task.grounded
    ? yield* askGroundedConversation(
        context.organizationId,
        task.grounded,
        [{ role: "user", content: task.prompt.text }],
        task.zdr
      )
    : null;
  const answer =
    grounded ??
    (yield* askEngine(
      context.organizationId,
      task.engine,
      task.prompt.text,
      task.zdr,
      resolveGeoEngineGateway(context.catalog, task.engine)
    ));
  const answerText = yield* requireAnswerText(
    task.engine,
    task.prompt.id,
    task.language,
    answer
  );
  const judged = yield* judgeAnswer(context, task.prompt.text, answerText);
  const usage = answer.usage
    ? addTokenUsage(EMPTY_TOKEN_USAGE, answer.usage)
    : EMPTY_TOKEN_USAGE;
  if (task.zdr !== "none" && answer.zdrEnforced === false) {
    yield* geoLogWarn({
      ...checkFailureFields(context, task),
      event: "geo.check.zdr_relaxed",
      zdr: task.zdr,
    });
  }

  const row: GeoCheckWrite = {
    organizationId: context.organizationId,
    projectId: context.projectId,
    scanId: context.scanId,
    engine: task.engine,
    promptId: task.prompt.id,
    sequenceId: null,
    turn: 0,
    prompt: task.prompt.text,
    answer: answerText,
    capturedAt: context.capturedAt,
    mentioned: judged.mentioned,
    position: normalizePosition(judged.position),
    sentiment: judged.sentiment,
    competitors: judged.competitors.slice(0, MAX_JUDGE_COMPETITORS),
    excerpt: judged.excerpt.slice(0, GEO_EXCERPT_MAX_LENGTH),
    grounding: answer.grounding,
    finishReason: answer.finishReason,
    promptTokens: answer.usage?.inputTokens ?? null,
    outputTokens: answer.usage?.outputTokens ?? null,
    reasoningTokens: answer.usage?.reasoningTokens ?? null,
    zdrEnforced: answer.zdrEnforced,
    language: task.language,
    sources: answer.sources,
  };

  const outcome: GeoCheckOutcome = { row, usage };
  return outcome;
});

export function parseGeoClaimToken(
  claimedAt: string
): Effect.Effect<Date, GeoScanError> {
  return Effect.suspend(() => {
    const parsed = new Date(claimedAt);
    if (Number.isNaN(parsed.getTime())) {
      return Effect.fail(
        new GeoScanError({ message: `Invalid scan claim token: ${claimedAt}` })
      );
    }
    return Effect.succeed(parsed);
  });
}

/**
 * Loads the settings rows a scan run covers and returns the enabled project
 * ids in creation order. Also releases the phantom "scanning" stamp of rows
 * that were disabled while a scan was running, exactly like the old
 * whole-scan program did on entry.
 */
export const listGeoScanProjects = Effect.fn("geo.listScanProjects")(function* (
  organizationId: string,
  options: {
    projectId?: string;
    projectIds?: readonly string[];
    claimedAt?: Date;
  } = {}
) {
  const scopedProjectIds =
    options.projectIds ?? (options.projectId ? [options.projectId] : undefined);
  const settingsRows = yield* Effect.tryPromise({
    try: () =>
      db.query.geoSettings.findMany({
        columns: {
          projectId: true,
          enabled: true,
          scanStartedAt: true,
          lastScanAt: true,
        },
        where: scopedProjectIds
          ? and(
              eq(geoSettings.organizationId, organizationId),
              inArray(geoSettings.projectId, scopedProjectIds)
            )
          : eq(geoSettings.organizationId, organizationId),
        orderBy: [asc(geoSettings.createdAt)],
      }),
    catch: (cause) =>
      new GeoScanError({ message: "Failed to load GEO settings", cause }),
  });

  for (const row of settingsRows) {
    if (row.enabled || !isGeoScanRunning(row.scanStartedAt, row.lastScanAt)) {
      continue;
    }
    const releaseToken =
      row.projectId === options.projectId && options.claimedAt
        ? options.claimedAt
        : (row.scanStartedAt ?? undefined);
    yield* releaseGeoScanRun(row.projectId, releaseToken).pipe(
      geoSkip("scan claim release failed")
    );
  }

  const enabledRows = settingsRows.filter((row) => row.enabled);
  if (enabledRows.length === 0) {
    yield* geoLogWarn({
      event: "geo.scan.skipped",
      reason: "disabled",
      organizationId,
      projectId:
        scopedProjectIds?.length === 1 ? (scopedProjectIds[0] ?? null) : null,
    });
  }
  return enabledRows.map((row) => row.projectId);
});

/**
 * First step of a project scan: takes (or revalidates) the scan-slot claim,
 * reserves billing, materializes the `geo_scans` row, and compiles the full
 * task list — engines × prompts × languages plus grounded sequences — into a
 * serializable plan the batch steps execute. Everything that must happen
 * exactly once per scan lives here; everything model-call-shaped lives in the
 * batches.
 */
export const prepareGeoScanProject = Effect.fn("geo.prepareScanProject")(
  function* (
    organizationId: string,
    projectId: string,
    options: { claimedAt?: Date; scanId?: string; promptIds?: string[] } = {}
  ) {
    const billing = yield* GeoContentBillingService;
    const settingsRow = yield* Effect.tryPromise({
      try: () =>
        db.query.geoSettings.findFirst({
          where: and(
            eq(geoSettings.organizationId, organizationId),
            eq(geoSettings.projectId, projectId)
          ),
        }),
      catch: (cause) =>
        new GeoScanError({ message: "Failed to load GEO settings", cause }),
    });

    const failHandedScanRow = options.scanId
      ? failPendingGeoScanRow(
          { organizationId, projectId },
          options.scanId
        ).pipe(geoSkip("scan row fail stamp failed"))
      : Effect.void;

    if (!settingsRow?.enabled) {
      if (options.claimedAt) {
        yield* releaseGeoScanRun(projectId, options.claimedAt).pipe(
          geoSkip("scan claim release failed")
        );
      }
      yield* failHandedScanRow;
      yield* geoLogWarn({
        event: "geo.scan.skipped",
        reason: "disabled",
        organizationId,
        projectId,
      });
      const skipped: GeoScanProjectPlanResult = {
        status: "skipped",
        reason: "disabled",
      };
      return skipped;
    }

    let claimedAt: Date;
    if (options.claimedAt) {
      const renewed = yield* renewGeoScanRun(projectId, options.claimedAt);
      if (!renewed) {
        yield* failHandedScanRow;
        yield* geoLogWarn({
          event: "geo.scan.skipped",
          reason: "claim_lost",
          organizationId,
          projectId,
        });
        const skipped: GeoScanProjectPlanResult = {
          status: "skipped",
          reason: "claim_lost",
        };
        return skipped;
      }
      claimedAt = renewed.claimedAt;
    } else {
      const claim = yield* claimGeoScanRun(projectId).pipe(
        geoSkip("scan claim failed")
      );
      if (!claim) {
        yield* geoLogWarn({
          event: "geo.scan.skipped",
          reason: "already_running",
          organizationId,
          projectId,
        });
        const skipped: GeoScanProjectPlanResult = {
          status: "skipped",
          reason: "already_running",
        };
        return skipped;
      }
      claimedAt = claim.claimedAt;
    }

    const releaseClaim = releaseGeoScanRun(projectId, claimedAt).pipe(
      geoSkip("scan claim release failed")
    );

    const runId = `geo-scan-${projectId}-${crypto.randomUUID()}`;
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
            new GeoScanError({ message: "Failed to reserve AI answers", cause })
        ),
        Effect.tapError(() =>
          releaseClaim.pipe(Effect.andThen(failHandedScanRow))
        )
      );
    if (!gate.allowed) {
      yield* geoLogWarn({
        event: "geo.scan.skipped",
        reason: "billing",
        organizationId,
        projectId,
        runId,
        detail: describeContentBillingDenial(gate),
      });
      yield* releaseClaim;
      yield* failHandedScanRow;
      const skipped: GeoScanProjectPlanResult = {
        status: "skipped",
        reason: "billing",
      };
      return skipped;
    }

    const releaseBilling = billing
      .finalizeContentBilling({
        reservation: gate,
        action: "release",
        logPrefix: "GeoScan",
      })
      .pipe(
        Effect.catch((releaseError) =>
          Effect.sync(() => {
            logGeoBillingFailure("release", projectId, runId, releaseError);
          })
        )
      );

    const scanId = yield* createGeoScanRow(
      { organizationId, projectId },
      options.scanId
    ).pipe(
      Effect.tapError(() => releaseBilling.pipe(Effect.andThen(releaseClaim)))
    );

    const plan = yield* buildGeoScanProjectPlan(
      settingsRow,
      scanId,
      runId,
      gate,
      claimedAt,
      options.promptIds
    ).pipe(
      Effect.tapError(() =>
        releaseBilling.pipe(
          Effect.andThen(releaseClaim),
          Effect.andThen(
            failPendingGeoScanRow({ organizationId, projectId }, scanId).pipe(
              geoSkip("scan row fail stamp failed")
            )
          )
        )
      )
    );
    const planned: GeoScanProjectPlanResult = { status: "planned", plan };
    return planned;
  }
);

const buildGeoScanProjectPlan = Effect.fn("geo.buildScanProjectPlan")(
  function* (
    settingsRow: GeoSettingsRow,
    scanId: string,
    runId: string,
    gate: GeoScanProjectContext["gate"],
    claimedAt: Date,
    promptIds?: readonly string[]
  ) {
    const organizationId = settingsRow.organizationId;
    const catalog = yield* loadGeoModelCatalog(organizationId);
    const settings = toGeoSettings(settingsRow, catalog);

    const brand = yield* Effect.tryPromise({
      try: () =>
        db.query.brandSettings.findFirst({
          columns: { companyDescription: true, audience: true },
          where: and(
            eq(brandSettings.organizationId, organizationId),
            eq(brandSettings.isDefault, true)
          ),
        }),
      catch: (cause) =>
        new GeoScanError({ message: "Failed to load brand settings", cause }),
    });

    const customRows = yield* Effect.tryPromise({
      try: () =>
        db.query.geoPrompts.findMany({
          columns: { id: true, prompt: true },
          where: and(
            eq(geoPrompts.projectId, settingsRow.projectId),
            eq(geoPrompts.enabled, true)
          ),
          orderBy: [asc(geoPrompts.createdAt)],
        }),
      catch: (cause) =>
        new GeoScanError({ message: "Failed to load GEO prompts", cause }),
    });

    const pausedAutoPromptIds = new Set(settings.pausedAutoPromptIds);
    const autoPrompts = buildGeoPrompts(
      settings,
      brand
        ? {
            companyDescription: brand.companyDescription,
            audience: brand.audience,
          }
        : null
    )
      .filter((prompt) => !pausedAutoPromptIds.has(prompt.id))
      .slice(0, GEO_MAX_PROMPTS);

    const allPrompts: GeoPromptDefinition[] = [
      ...autoPrompts,
      ...customRows.map((row) => ({
        id: customPromptScanId(row.id),
        text: row.prompt,
      })),
    ];
    const prompts = promptIds
      ? scopeGeoPrompts(allPrompts, promptIds)
      : allPrompts;
    if (promptIds && prompts.length === 0) {
      yield* geoLogWarn({
        event: "geo.scan.skipped",
        reason: "scoped_prompts_missing",
        organizationId,
        projectId: settingsRow.projectId,
        scanId,
        runId,
        promptIds: [...promptIds],
      });
    }

    const zdrPolicy = yield* resolveScanZdrPolicy(organizationId, settings, {
      projectId: settingsRow.projectId,
      scanId,
    });
    const trackedEngines: { engine: string; zdr: GeoZdrMode }[] = [];
    for (const engine of new Set(settings.engines)) {
      const zdr = resolveGeoZdrMode(catalog, engine, zdrPolicy);
      if (zdr === null) {
        yield* geoLogWarn({
          event: "geo.scan.skipped",
          reason: "zdr",
          organizationId,
          projectId: settingsRow.projectId,
          scanId,
          engine,
        });
        continue;
      }
      trackedEngines.push({ engine, zdr });
    }
    const scanEnglish = settings.languages.includes(DEFAULT_LANGUAGE);
    const tasks: GeoScanPlannedTask[] = [];
    if (scanEnglish) {
      for (const { engine, zdr } of trackedEngines) {
        for (const prompt of prompts) {
          tasks.push({
            engine,
            groundedKey: null,
            prompt,
            language: DEFAULT_LANGUAGE,
            zdr,
          });
        }
      }
    }

    const groundedEngines: { grounded: GeoGroundedEngine; zdr: GeoZdrMode }[] =
      [];
    for (const grounded of resolveGroundedEngines(settings.engines, catalog)) {
      const zdr = resolveGeoGroundedZdrMode(catalog, grounded, zdrPolicy);
      if (zdr === null) {
        yield* geoLogWarn({
          event: "geo.scan.skipped",
          reason: "zdr",
          organizationId,
          projectId: settingsRow.projectId,
          scanId,
          engine: grounded.key,
        });
        continue;
      }
      groundedEngines.push({ grounded, zdr });
    }
    const groundedPrompts = scanEnglish
      ? prompts.slice(0, GEO_GROUNDED_MAX_PROMPTS)
      : [];
    for (const { grounded, zdr } of groundedEngines) {
      for (const prompt of groundedPrompts) {
        tasks.push({
          engine: grounded.key,
          groundedKey: grounded.key,
          prompt,
          language: DEFAULT_LANGUAGE,
          zdr,
        });
      }
    }

    const extraLanguages = settings.languages
      .filter((language) => language !== DEFAULT_LANGUAGE)
      .slice(0, GEO_MAX_LANGUAGES);
    const localizedByLanguage = yield* Effect.forEach(
      extraLanguages,
      (language) =>
        translatePrompts(
          organizationId,
          language,
          prompts.slice(0, GEO_LANGUAGE_MAX_PROMPTS)
        )
          .pipe(
            geoSkip(`skipping language ${language}`, {
              event: "geo.check.failed",
              organizationId,
              projectId: settingsRow.projectId,
              scanId,
              language,
              grounded: false,
            })
          )
          .pipe(
            Effect.map((localized) =>
              localized ? { language, localized } : null
            )
          ),
      { concurrency: GEO_SCAN_CONCURRENCY }
    );
    for (const entry of localizedByLanguage) {
      if (!entry) {
        continue;
      }
      const { language, localized } = entry;
      for (const { engine, zdr } of trackedEngines) {
        for (const prompt of localized) {
          tasks.push({ engine, groundedKey: null, prompt, language, zdr });
        }
      }
      const localizedGrounded = localized.slice(
        0,
        GEO_LANGUAGE_GROUNDED_MAX_PROMPTS
      );
      for (const { grounded, zdr } of groundedEngines) {
        for (const prompt of localizedGrounded) {
          tasks.push({
            engine: grounded.key,
            groundedKey: grounded.key,
            prompt,
            language,
            zdr,
          });
        }
      }
    }

    const sequenceRows = yield* Effect.tryPromise({
      try: () =>
        db.query.geoPromptSequences.findMany({
          columns: { id: true, steps: true },
          where: and(
            eq(geoPromptSequences.projectId, settingsRow.projectId),
            eq(geoPromptSequences.enabled, true)
          ),
          orderBy: [asc(geoPromptSequences.createdAt)],
          limit: GEO_MAX_SEQUENCES,
        }),
      catch: (cause) =>
        new GeoScanError({ message: "Failed to load GEO sequences", cause }),
    });
    const trackedOpenCode = trackedEngines.find(
      ({ engine }) => engine === GEO_OPENCODE_ENGINE_ID
    );
    const sequences: GeoScanPlannedSequence[] = scanEnglish
      ? sequenceRows.flatMap((sequence) => [
          ...groundedEngines.map(({ grounded, zdr }) => ({
            sequenceId: sequence.id,
            steps: sequence.steps,
            engine: grounded.key,
            groundedKey: grounded.key,
            zdr,
          })),
          ...(trackedOpenCode
            ? [
                {
                  sequenceId: sequence.id,
                  steps: sequence.steps,
                  engine: trackedOpenCode.engine,
                  groundedKey: null,
                  zdr: trackedOpenCode.zdr,
                },
              ]
            : []),
        ])
      : [];

    const personaRows = yield* Effect.tryPromise({
      try: () =>
        db.query.geoPersonas.findMany({
          columns: { id: true },
          where: and(
            eq(geoPersonas.projectId, settingsRow.projectId),
            eq(geoPersonas.enabled, true)
          ),
          orderBy: [asc(geoPersonas.createdAt)],
          limit: GEO_PERSONA_MAX_COUNT,
        }),
      catch: (cause) =>
        new GeoScanError({ message: "Failed to load GEO personas", cause }),
    });
    const personas: GeoScanPlannedPersona[] = scanEnglish
      ? personaRows.flatMap((persona) =>
          groundedEngines.map(({ grounded, zdr }) => ({
            personaId: persona.id,
            engine: grounded.key,
            groundedKey: grounded.key,
            zdr,
          }))
        )
      : [];

    const engines = [
      ...trackedEngines.map((entry) => entry.engine),
      ...groundedEngines.map((entry) => entry.grounded.key),
    ];
    yield* geoLogInfo({
      event: "geo.scan.started",
      organizationId,
      projectId: settingsRow.projectId,
      scanId,
      runId,
      engines,
      enforceZdr: zdrPolicy.enforceZdr,
      zdrModes: Object.fromEntries([
        ...trackedEngines.map((entry) => [entry.engine, entry.zdr]),
        ...groundedEngines.map((entry) => [entry.grounded.key, entry.zdr]),
      ]),
      promptCount: prompts.length,
      languages: settings.languages,
      tasks: tasks.length,
      personas: personas.length,
    });

    const plan: GeoScanProjectPlan = {
      context: {
        organizationId,
        projectId: settingsRow.projectId,
        scanId,
        runId,
        companyName: settings.companyName,
        aliases: settings.aliases,
        gate,
        startedAtMs: Date.now(),
      },
      claimedAt: claimedAt.toISOString(),
      tasks,
      sequences,
      personas,
      promptCount: prompts.length,
      languages: settings.languages,
      engines,
    };
    return plan;
  }
);

export const buildGeoScanCheckContext = Effect.fn("geo.buildScanCheckContext")(
  function* (context: GeoScanProjectContext) {
    const catalog = yield* loadGeoModelCatalog(context.organizationId);
    const checkContext: GeoCheckContext = {
      organizationId: context.organizationId,
      projectId: context.projectId,
      scanId: context.scanId,
      catalog,
      capturedAt: new Date(),
      companyName: context.companyName,
      aliases: context.aliases,
    };
    return checkContext;
  }
);

/**
 * Runs one batch of planned checks, persisting its rows before returning so a
 * later failure can only ever lose the batch in flight. Sized via
 * `GEO_SCAN_TASK_BATCH_SIZE` to fit comfortably inside one function
 * invocation — the whole scan used to run in a single step and was killed by
 * the platform's function timeout as soon as an organization tracked enough
 * engines.
 */
export const runGeoScanTaskBatch = Effect.fn("geo.runScanTaskBatch")(function* (
  context: GeoScanProjectContext,
  plannedTasks: readonly GeoScanPlannedTask[],
  claimToken: string
) {
  const incoming = yield* parseGeoClaimToken(claimToken);
  const claimedAt = yield* renewGeoScanClaimIfDue(context.projectId, incoming);
  const checkContext = yield* buildGeoScanCheckContext(context);

  const tasks: GeoCheckTask[] = [];
  let unavailableGrounded = 0;
  for (const planned of plannedTasks) {
    if (!planned.groundedKey) {
      tasks.push({ ...planned, grounded: null });
      continue;
    }
    const grounded = resolveGroundedEngineByKey(planned.groundedKey);
    if (!grounded) {
      unavailableGrounded += 1;
      yield* geoLogWarn({
        event: "geo.check.failed",
        organizationId: context.organizationId,
        projectId: context.projectId,
        scanId: context.scanId,
        engine: planned.engine,
        promptId: planned.prompt.id,
        language: planned.language,
        grounded: true,
        detail: "grounded engine unavailable",
      });
      continue;
    }
    tasks.push({ ...planned, grounded });
  }

  const results = yield* Effect.forEach(
    tasks,
    (task) => {
      const fields = checkFailureFields(checkContext, task);
      return runGeoCheck(checkContext, task).pipe(
        Effect.tapError((error) =>
          (error._tag === "GeoScanError" || error._tag === "GeoJudgeError") &&
          error.timedOut === true
            ? geoLogWarn({
                ...fields,
                event: "geo.check.timeout",
                detail: error.message,
              })
            : Effect.void
        ),
        Effect.retry({
          times: 1,
          while: (error) =>
            (error._tag === "GeoScanError" || error._tag === "GeoJudgeError") &&
            error.timedOut === true,
        }),
        Effect.catchTag("GeoEmptyAnswerError", (error) =>
          Effect.sync(() => droppedCheckOutcome(fields, error))
        ),
        geoSkip("check failed", fields)
      );
    },
    { concurrency: GEO_SCAN_CONCURRENCY }
  );
  const persistedRows = results.map((result) => result?.row ?? null);

  for (const summary of summarizeGeoEngineAttempts(tasks, persistedRows)) {
    if (summary.attempted === 0 || summary.failed < summary.attempted) {
      continue;
    }
    yield* geoLogError({
      event: "geo.scan.engine_dropped",
      organizationId: context.organizationId,
      projectId: context.projectId,
      scanId: context.scanId,
      engine: summary.engine,
      attempted: summary.attempted,
      failed: summary.failed,
    });
  }

  const checkOutcomes = results.filter(
    (result): result is GeoCheckOutcome => result !== null
  );
  const rows = persistedRows.filter(
    (row): row is GeoCheckWrite => row !== null
  );
  const usage = checkOutcomes.reduce(
    (total, outcome) => addTokenUsage(total, outcome.usage),
    EMPTY_TOKEN_USAGE
  );

  if (rows.length > 0) {
    yield* Effect.tryPromise({
      try: () => insertGeoMentionChecks(rows),
      catch: (cause) =>
        new GeoScanError({ message: "Failed to store GEO checks", cause }),
    });
  }

  const outcome: GeoScanBatchOutcome = {
    checks: rows.length,
    mentions: rows.filter((row) => row.mentioned).length,
    dropped: plannedTasks.length - rows.length,
    usage,
    claimedAt: claimedAt.toISOString(),
  };
  return outcome;
});

/** Runs one batch of conversation sequences; same contract as `runGeoScanTaskBatch`. */
export const runGeoScanSequenceBatch = Effect.fn("geo.runScanSequenceBatch")(
  function* (
    context: GeoScanProjectContext,
    plannedSequences: readonly GeoScanPlannedSequence[],
    claimToken: string
  ) {
    const incoming = yield* parseGeoClaimToken(claimToken);
    const claimedAt = yield* renewGeoScanClaimIfDue(
      context.projectId,
      incoming
    );
    const checkContext = yield* buildGeoScanCheckContext(context);

    let checks = 0;
    let mentions = 0;
    let dropped = 0;
    let usage = EMPTY_TOKEN_USAGE;

    const outcomes = yield* Effect.forEach(
      plannedSequences,
      (planned) => {
        const sequence: GeoSequenceDefinition = {
          id: planned.sequenceId,
          steps: planned.steps,
        };
        if (!planned.groundedKey) {
          if (planned.engine !== GEO_OPENCODE_ENGINE_ID) {
            return Effect.succeed({ sequence, result: null });
          }
          return runGeoOpenCodeSequenceCheck(
            checkContext,
            sequence,
            planned.zdr
          ).pipe(
            geoSkip(
              "sequence failed",
              sequenceFailureFields(
                checkContext,
                sequence,
                planned.engine,
                false
              )
            ),
            Effect.map((result) => ({ sequence, result }))
          );
        }
        const grounded = resolveGroundedEngineByKey(planned.groundedKey);
        if (!grounded) {
          return Effect.succeed({ sequence, result: null });
        }
        return runGeoSequenceCheck(
          checkContext,
          sequence,
          grounded,
          planned.zdr
        ).pipe(
          Effect.timeoutOrElse({
            duration: GEO_SEQUENCE_PAIR_TIMEOUT_MS,
            orElse: () =>
              Effect.fail(
                new GeoScanError({
                  message: `Sequence ${sequence.id} on ${grounded.key} timed out after ${GEO_SEQUENCE_PAIR_TIMEOUT_MS}ms`,
                })
              ),
          }),
          geoSkip(
            "sequence failed",
            sequenceFailureFields(checkContext, sequence, grounded.key, true)
          ),
          Effect.map((result) => ({ sequence, result }))
        );
      },
      { concurrency: GEO_SCAN_CONCURRENCY }
    );

    const rows: GeoCheckWrite[] = [];
    for (const { sequence, result } of outcomes) {
      if (!result) {
        dropped += sequenceTurnCount(sequence);
        continue;
      }
      dropped += result.droppedTurns;
      rows.push(...result.rows);
      usage = addTokenUsage(usage, result.usage);
    }
    if (rows.length > 0) {
      yield* Effect.tryPromise({
        try: () => insertGeoMentionChecks(rows),
        catch: (cause) =>
          new GeoScanError({ message: "Failed to store GEO checks", cause }),
      });
      checks = rows.length;
      mentions = rows.filter((row) => row.mentioned).length;
    }

    const outcome: GeoScanBatchOutcome = {
      checks,
      mentions,
      dropped,
      usage,
      claimedAt: claimedAt.toISOString(),
    };
    return outcome;
  }
);

/**
 * Ends one project scan: settles the billing reservation, writes the
 * `geo_scans` verdict, and ends the slot claim. Runs on both outcomes so a
 * failed run can no longer leave a row on "running" or a reservation held.
 */
export const finalizeGeoScanProject = Effect.fn("geo.finalizeScanProject")(
  function* (
    context: GeoScanProjectContext,
    totals: GeoScanProjectTotals,
    status: "completed" | "failed",
    claimToken: string
  ) {
    const billing = yield* GeoContentBillingService;
    const claimedAt = yield* parseGeoClaimToken(claimToken).pipe(
      geoSkip("scan claim token invalid")
    );

    if (status === "completed") {
      yield* billing
        .finalizeContentBilling({
          reservation: context.gate,
          action: "confirm",
          units: totals.checks,
          usage: totals.usage,
          fallbackModelId: GEO_JUDGE_MODEL,
          properties: {
            source: "geo_scan",
            run_id: context.runId,
            project_id: context.projectId,
            markup_applied: context.gate.useMarkup,
          },
          logPrefix: "GeoScan",
        })
        .pipe(
          Effect.catch((confirmError) =>
            Effect.sync(() => {
              logGeoBillingFailure(
                "confirm",
                context.projectId,
                context.runId,
                confirmError
              );
            })
          )
        );
    } else {
      yield* billing
        .finalizeContentBilling({
          reservation: context.gate,
          action: "release",
          logPrefix: "GeoScan",
        })
        .pipe(
          Effect.catch((releaseError) =>
            Effect.sync(() => {
              logGeoBillingFailure(
                "release",
                context.projectId,
                context.runId,
                releaseError
              );
            })
          )
        );
    }

    yield* finishGeoScanRow(
      { organizationId: context.organizationId, projectId: context.projectId },
      context.scanId,
      status
    ).pipe(
      geoSkip("scan row finish failed", {
        event: "geo.scan.stamp_failed",
        projectId: context.projectId,
        scanId: context.scanId,
        stamp: status,
      })
    );

    if (claimedAt) {
      const endClaim =
        status === "completed"
          ? markGeoScanFinished(context.projectId, claimedAt).pipe(
              geoSkip("scan finish stamp failed", {
                event: "geo.scan.stamp_failed",
                projectId: context.projectId,
                stamp: "finished",
              })
            )
          : releaseGeoScanRun(context.projectId, claimedAt).pipe(
              geoSkip("scan claim release failed")
            );
      yield* endClaim;
    }

    yield* geoLogInfo({
      event: "geo.scan.finished",
      status,
      organizationId: context.organizationId,
      projectId: context.projectId,
      scanId: context.scanId,
      runId: context.runId,
      checks: totals.checks,
      mentions: totals.mentions,
      droppedChecks: totals.dropped,
      durationMs: Date.now() - context.startedAtMs,
    });
    yield* flushGeoLogEffect;
  }
);

export function addTokenUsage(
  total: AgentTokenUsage,
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }
): AgentTokenUsage {
  return {
    inputTokens: total.inputTokens + (usage.inputTokens ?? 0),
    outputTokens: total.outputTokens + (usage.outputTokens ?? 0),
    totalTokens: total.totalTokens + (usage.totalTokens ?? 0),
    cacheReadTokens: total.cacheReadTokens,
    cacheWriteTokens: total.cacheWriteTokens,
  };
}

export const EMPTY_TOKEN_USAGE: AgentTokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

export function logGeoBillingFailure(
  action: "release" | "confirm",
  projectId: string,
  runId: string,
  error: unknown
): void {
  geoLog.error({
    event: "geo.scan.billing_failed",
    action,
    projectId,
    runId,
    ...describeGeoError(error),
  });
}

const runGeoSequenceCheck = Effect.fn("geo.runSequenceCheck")(function* (
  context: GeoCheckContext,
  sequence: GeoSequenceDefinition,
  grounded: GeoGroundedEngine,
  zdr: GeoZdrMode
) {
  const rows: GeoCheckWrite[] = [];
  const messages: ModelMessage[] = [];
  const steps = sequence.steps.slice(0, GEO_SEQUENCE_MAX_TURNS);
  const failureFields = sequenceFailureFields(
    context,
    sequence,
    grounded.key,
    true
  );
  let usage = EMPTY_TOKEN_USAGE;
  let droppedTurns = 0;

  for (const [index, step] of steps.entries()) {
    messages.push({ role: "user", content: step });
    const answer = yield* askGroundedConversation(
      context.organizationId,
      grounded,
      messages,
      zdr
    );
    usage = addTokenUsage(usage, answer.usage);
    if (zdr !== "none" && answer.zdrEnforced === false) {
      yield* geoLogWarn({
        ...failureFields,
        event: "geo.check.zdr_relaxed",
        turn: index,
        zdr,
      });
    }
    const answerText = yield* requireAnswerText(
      grounded.key,
      sequencePromptId(sequence.id),
      DEFAULT_LANGUAGE,
      answer
    ).pipe(
      Effect.catchTag("GeoEmptyAnswerError", (error) =>
        Effect.sync(() => {
          logGeoSkip(
            "sequence turn failed",
            { ...failureFields, turn: index + 1 },
            error
          );
          return null;
        })
      )
    );
    if (answerText === null) {
      droppedTurns = steps.length - index;
      break;
    }
    messages.push({ role: "assistant", content: answerText });
    const judged = yield* judgeAnswer(context, step, answerText);

    rows.push({
      organizationId: context.organizationId,
      projectId: context.projectId,
      scanId: context.scanId,
      engine: grounded.key,
      promptId: sequencePromptId(sequence.id),
      sequenceId: sequence.id,
      turn: index + 1,
      prompt: step,
      answer: answerText,
      capturedAt: context.capturedAt,
      mentioned: judged.mentioned,
      position: normalizePosition(judged.position),
      sentiment: judged.sentiment,
      competitors: judged.competitors.slice(0, MAX_JUDGE_COMPETITORS),
      excerpt: judged.excerpt.slice(0, GEO_EXCERPT_MAX_LENGTH),
      grounding: answer.grounding,
      finishReason: answer.finishReason,
      promptTokens: answer.usage.inputTokens ?? null,
      outputTokens: answer.usage.outputTokens ?? null,
      reasoningTokens: answer.usage.reasoningTokens ?? null,
      zdrEnforced: answer.zdrEnforced,
      language: DEFAULT_LANGUAGE,
      sources: answer.sources,
    });
  }

  const outcome: GeoSequenceCheckOutcome = { rows, usage, droppedTurns };
  return outcome;
});

const runGeoOpenCodeSequenceCheck = Effect.fn("geo.runOpenCodeSequenceCheck")(
  function* (
    context: GeoCheckContext,
    sequence: GeoSequenceDefinition,
    zdr: GeoZdrMode
  ) {
    const rows: GeoCheckWrite[] = [];
    const steps = sequence.steps.slice(0, GEO_SEQUENCE_MAX_TURNS);
    const deadlineAtMs = Date.now() + GEO_SEQUENCE_PAIR_TIMEOUT_MS;
    const failureFields = sequenceFailureFields(
      context,
      sequence,
      GEO_OPENCODE_ENGINE_ID,
      false
    );
    let conversationPromise: ReturnType<
      typeof askGeoOpenCodeConversation
    > | null = null;
    const results = yield* Effect.tryPromise({
      try: (signal) => {
        conversationPromise = askGeoOpenCodeConversation(
          steps.map(
            (step) =>
              `${GEO_OPENCODE_ANSWER_SYSTEM_PROMPT}\n\nUser question:\n${step}`
          ),
          signal,
          deadlineAtMs
        );
        return conversationPromise;
      },
      catch: (cause) =>
        new GeoScanError({
          message: `Engine ${GEO_OPENCODE_ENGINE_ID} failed to answer the conversation`,
          cause,
        }),
    }).pipe(
      Effect.ensuring(
        Effect.uninterruptible(
          Effect.promise(
            () =>
              conversationPromise?.then(
                () => undefined,
                () => undefined
              ) ?? Promise.resolve()
          )
        )
      ),
      Effect.timeoutOrElse({
        duration: Math.max(1, deadlineAtMs - Date.now()),
        orElse: () =>
          Effect.fail(
            new GeoScanError({
              message: `Sequence ${sequence.id} on ${GEO_OPENCODE_ENGINE_ID} timed out after ${GEO_SEQUENCE_PAIR_TIMEOUT_MS}ms`,
            })
          ),
      })
    );
    const usage = results.reduce(
      (total, result) => addTokenUsage(total, result.usage),
      EMPTY_TOKEN_USAGE
    );
    let droppedTurns = 0;

    for (const [index, step] of steps.entries()) {
      const result = results[index];
      if (!result) {
        droppedTurns = steps.length - index;
        break;
      }
      const answer: GeoEngineAnswer = {
        text: result.text,
        grounding: extractGrounding(result),
        sources: result.sources,
        finishReason: "stop",
        usage: result.usage,
        zdrEnforced: false,
      };
      if (zdr !== "none") {
        yield* geoLogWarn({
          ...failureFields,
          event: "geo.check.zdr_relaxed",
          turn: index,
          zdr,
        });
      }
      const answerText = yield* requireAnswerText(
        GEO_OPENCODE_ENGINE_ID,
        sequencePromptId(sequence.id),
        DEFAULT_LANGUAGE,
        answer
      ).pipe(
        Effect.catchTag("GeoEmptyAnswerError", (error) =>
          Effect.sync(() => {
            logGeoSkip(
              "sequence turn failed",
              { ...failureFields, turn: index + 1 },
              error
            );
            return null;
          })
        )
      );
      if (answerText === null) {
        droppedTurns = steps.length - index;
        break;
      }
      const judgeTimeoutMs = deadlineAtMs - Date.now();
      if (judgeTimeoutMs <= 0) {
        return yield* Effect.fail(
          new GeoScanError({
            message: `Sequence ${sequence.id} on ${GEO_OPENCODE_ENGINE_ID} timed out after ${GEO_SEQUENCE_PAIR_TIMEOUT_MS}ms`,
          })
        );
      }
      const judged = yield* judgeAnswer(context, step, answerText).pipe(
        Effect.timeoutOrElse({
          duration: judgeTimeoutMs,
          orElse: () =>
            Effect.fail(
              new GeoScanError({
                message: `Sequence ${sequence.id} on ${GEO_OPENCODE_ENGINE_ID} timed out after ${GEO_SEQUENCE_PAIR_TIMEOUT_MS}ms`,
              })
            ),
        })
      );

      rows.push({
        organizationId: context.organizationId,
        projectId: context.projectId,
        scanId: context.scanId,
        engine: GEO_OPENCODE_ENGINE_ID,
        promptId: sequencePromptId(sequence.id),
        sequenceId: sequence.id,
        turn: index + 1,
        prompt: step,
        answer: answerText,
        capturedAt: context.capturedAt,
        mentioned: judged.mentioned,
        position: normalizePosition(judged.position),
        sentiment: judged.sentiment,
        competitors: judged.competitors.slice(0, MAX_JUDGE_COMPETITORS),
        excerpt: judged.excerpt.slice(0, GEO_EXCERPT_MAX_LENGTH),
        grounding: answer.grounding,
        finishReason: answer.finishReason,
        promptTokens: answer.usage?.inputTokens ?? null,
        outputTokens: answer.usage?.outputTokens ?? null,
        reasoningTokens: answer.usage?.reasoningTokens ?? null,
        zdrEnforced: answer.zdrEnforced,
        language: DEFAULT_LANGUAGE,
        sources: answer.sources,
      });
    }

    const outcome: GeoSequenceCheckOutcome = { rows, usage, droppedTurns };
    return outcome;
  }
);

/**
 * Plays a single conversation against every available replay engine right
 * away, outside the scheduled scan. The run is recorded as a regular
 * `geo_scans` row so its checks show up alongside scan results, and it is
 * charged against the organization's AI credits.
 */
const runGeoSequenceNowProgram = Effect.fn("geo.runSequenceNow")(function* (
  input: GeoScopeInput,
  sequenceId: string
) {
  const billing = yield* GeoContentBillingService;
  const scope = yield* requireGeoProject(input);
  const projectId = scope.projectId;

  const sequenceRow = yield* Effect.tryPromise({
    try: () =>
      db.query.geoPromptSequences.findFirst({
        columns: { id: true, steps: true },
        where: and(
          eq(geoPromptSequences.id, sequenceId),
          eq(geoPromptSequences.projectId, projectId)
        ),
      }),
    catch: (cause) =>
      new GeoSequenceRunError({
        message: "Failed to load the conversation",
        cause,
      }),
  });
  if (!sequenceRow) {
    return yield* Effect.fail(new GeoSequenceNotFoundError({ sequenceId }));
  }

  const settingsRow = yield* Effect.tryPromise({
    try: () =>
      db.query.geoSettings.findFirst({
        where: eq(geoSettings.projectId, projectId),
      }),
    catch: (cause) =>
      new GeoSequenceRunError({
        message: "Failed to load GEO settings",
        cause,
      }),
  });
  if (!settingsRow) {
    return yield* Effect.fail(
      new GeoSettingsMissingError({ organizationId: scope.organizationId })
    );
  }

  const catalog = yield* loadGeoModelCatalog(scope.organizationId);
  const settings = toGeoSettings(settingsRow, catalog);
  const zdrPolicy = yield* resolveScanZdrPolicy(
    scope.organizationId,
    settings,
    { projectId, sequenceId }
  );

  const groundedEngines: { grounded: GeoGroundedEngine; zdr: GeoZdrMode }[] =
    [];
  for (const grounded of resolveGroundedEngines(settings.engines, catalog)) {
    const zdr = resolveGeoGroundedZdrMode(catalog, grounded, zdrPolicy);
    if (zdr === null) {
      yield* geoLogWarn({
        event: "geo.scan.skipped",
        reason: "zdr",
        organizationId: scope.organizationId,
        projectId,
        sequenceId,
        engine: grounded.key,
      });
      continue;
    }
    groundedEngines.push({ grounded, zdr });
  }
  let openCodeZdr: GeoZdrMode | null = null;
  if (settings.engines.includes(GEO_OPENCODE_ENGINE_ID)) {
    openCodeZdr = resolveGeoZdrMode(catalog, GEO_OPENCODE_ENGINE_ID, zdrPolicy);
    if (openCodeZdr === null) {
      yield* geoLogWarn({
        event: "geo.scan.skipped",
        reason: "zdr",
        organizationId: scope.organizationId,
        projectId,
        sequenceId,
        engine: GEO_OPENCODE_ENGINE_ID,
      });
    }
  }
  const replayEngines = [
    ...groundedEngines.map((pair) => ({
      kind: "grounded" as const,
      ...pair,
    })),
    ...(openCodeZdr === null
      ? []
      : [{ kind: "opencode" as const, zdr: openCodeZdr }]),
  ];
  if (replayEngines.length === 0) {
    return yield* Effect.fail(new GeoSequenceRunUnavailableError({}));
  }

  const runId = `geo-sequence-${sequenceId}-${crypto.randomUUID()}`;
  const gate = yield* billing
    .gateContentBilling({
      organizationId: scope.organizationId,
      executionId: runId,
      outputType: null,
      quotaFeatureId: FEATURES.AI_ANSWERS,
    })
    .pipe(
      Effect.mapError(
        (cause) =>
          new GeoSequenceRunError({
            message: "Failed to reserve AI credits",
            cause,
          })
      )
    );
  if (!gate.allowed) {
    return yield* Effect.fail(
      new GeoWriterCreditsExhaustedError({
        message: describeContentBillingDenial(gate),
      })
    );
  }

  // A replay occupies the project's scan slot exactly like a scan does, so it
  // takes the same atomic claim instead of stamping "scanning" blindly. If a
  // scan already holds the slot the replay still runs — it is independently
  // billed and writes its own `geo_scans` row — but it must not touch the
  // stamps, because finishing them would hand that scan's claim away.
  const claim = yield* claimGeoScanRun(projectId).pipe(
    geoSkip("scan claim failed")
  );
  const play = withGeoScanRun(
    { organizationId: scope.organizationId, projectId },
    (scanId) =>
      Effect.gen(function* () {
        const context: GeoCheckContext = {
          organizationId: scope.organizationId,
          projectId,
          scanId,
          catalog,
          capturedAt: new Date(),
          companyName: settings.companyName,
          aliases: settings.aliases,
        };
        const outcomes = yield* Effect.forEach(
          replayEngines,
          (replayEngine) =>
            replayEngine.kind === "grounded"
              ? runGeoSequenceCheck(
                  context,
                  sequenceRow,
                  replayEngine.grounded,
                  replayEngine.zdr
                ).pipe(
                  geoSkip(
                    "sequence run failed",
                    sequenceFailureFields(
                      context,
                      sequenceRow,
                      replayEngine.grounded.key,
                      true
                    )
                  )
                )
              : runGeoOpenCodeSequenceCheck(
                  context,
                  sequenceRow,
                  replayEngine.zdr
                ).pipe(
                  geoSkip(
                    "sequence run failed",
                    sequenceFailureFields(
                      context,
                      sequenceRow,
                      GEO_OPENCODE_ENGINE_ID,
                      false
                    )
                  )
                ),
          { concurrency: GEO_SCAN_CONCURRENCY }
        );
        const succeeded = outcomes.filter(
          (outcome): outcome is GeoSequenceCheckOutcome => outcome !== null
        );
        const rows = succeeded.flatMap((outcome) => outcome.rows);
        const usage = succeeded.reduce(
          (total, outcome) => addTokenUsage(total, outcome.usage),
          EMPTY_TOKEN_USAGE
        );
        if (rows.length === 0) {
          return yield* Effect.fail(new GeoSequenceEmptyError({ usage }));
        }
        yield* Effect.tryPromise({
          try: () => insertGeoMentionChecks(rows),
          catch: (cause) =>
            new GeoSequenceRunError({
              message: "Failed to store the conversation results",
              cause,
            }),
        });
        return { rows, usage };
      }),
    claim ? { claimedAt: claim.claimedAt } : { skipStatusStamps: true as const }
  );

  const confirmBilling = (units: number, usage: AgentTokenUsage) =>
    billing
      .finalizeContentBilling({
        reservation: gate,
        action: "confirm",
        units,
        usage,
        fallbackModelId:
          groundedEngines[0]?.grounded.model ??
          (openCodeZdr === null ? GEO_JUDGE_MODEL : GEO_OPENCODE_ENGINE_ID),
        properties: {
          source: "geo_sequence_run",
          run_id: runId,
          sequence_id: sequenceId,
          markup_applied: gate.useMarkup,
        },
        logPrefix: "GeoSequenceRun",
      })
      .pipe(
        Effect.catch((confirmError) =>
          Effect.sync(() => {
            logGeoBillingFailure("confirm", projectId, runId, confirmError);
          })
        )
      );

  const result = yield* play.pipe(
    Effect.tapError((error) =>
      error._tag === "GeoSequenceEmptyError"
        ? confirmBilling(0, error.usage)
        : billing
            .finalizeContentBilling({
              reservation: gate,
              action: "release",
              logPrefix: "GeoSequenceRun",
            })
            .pipe(
              Effect.catch((releaseError) =>
                Effect.sync(() => {
                  logGeoBillingFailure(
                    "release",
                    projectId,
                    runId,
                    releaseError
                  );
                })
              )
            )
    ),
    Effect.catchTag("GeoSequenceEmptyError", () =>
      Effect.fail(
        new GeoSequenceRunError({
          message: "Engines failed to answer this conversation. Try again.",
        })
      )
    )
  );

  yield* confirmBilling(result.rows.length, result.usage);

  const response: GeoSequenceRunResponse = {
    checks: result.rows.length,
    mentions: result.rows.filter((row) => row.mentioned).length,
    engines: replayEngines.map((replayEngine) =>
      replayEngine.kind === "grounded"
        ? replayEngine.grounded.key
        : GEO_OPENCODE_ENGINE_ID
    ),
  };
  return response;
});

export function runGeoSequenceNow(input: GeoScopeInput, sequenceId: string) {
  return runGeoSequenceNowProgram(input, sequenceId).pipe(
    Effect.ensuring(flushGeoLogEffect)
  );
}
