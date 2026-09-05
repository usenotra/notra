import { generatePersonaNextTurn } from "@notra/ai/agents/geo-persona";
import { describeContentBillingDenial } from "@notra/ai/billing/content-billing";
import { FEATURES } from "@notra/ai/billing/features";
import { DEFAULT_LANGUAGE } from "@notra/ai/constants/languages";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type {
  PersonaAgentPersona,
  PersonaConversationTurn,
  PersonaMemoryRecord,
} from "@notra/ai/types/geo-personas";
import { db } from "@notra/db/drizzle";
import { geoPersonaMemories, geoPersonas, geoSettings } from "@notra/db/schema";
import type { GeoCheckWrite } from "@notra/db/types/geo-checks";
import { insertGeoMentionChecks } from "@notra/db/utils/geo-checks";
import type { ModelMessage } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  GEO_EXCERPT_MAX_LENGTH,
  GEO_JUDGE_MODEL,
  GEO_SCAN_CONCURRENCY,
} from "../constants/geo";
import {
  GEO_PERSONA_MAX_TURNS,
  GEO_PERSONA_PAIR_TIMEOUT_MS,
  GEO_PERSONA_TURN_TIMEOUT_MS,
} from "../constants/geo-personas";
import { GeoContentBillingService } from "../deps";
import type {
  GeoCheckContext,
  GeoGroundedEngine,
  GeoScanBatchOutcome,
  GeoScanPlannedPersona,
  GeoScanProjectContext,
  GeoScopeInput,
  GeoSkipFields,
  GeoZdrMode,
} from "../types/geo";
import type {
  GeoPersonaCheckOutcome,
  GeoPersonaRunResponse,
} from "../types/geo-personas";
import { resolveGeoGroundedZdrMode } from "../utils/geo-engines";
import {
  resolveGroundedEngineByKey,
  resolveGroundedEngines,
} from "../utils/geo-grounded-engines";
import { flushGeoLogEffect, geoLogWarn, logGeoSkip } from "../utils/geo-log";
import { personaPromptId } from "../utils/geo-personas";
import { geoSkip } from "./effect";
import {
  GeoPersonaEmptyError,
  GeoPersonaNotFoundError,
  GeoPersonaRunError,
  GeoPersonaRunUnavailableError,
  GeoScanError,
  GeoSettingsMissingError,
  GeoWriterCreditsExhaustedError,
} from "./errors";
import { toGeoSettings } from "./mappers";
import { loadGeoModelCatalog } from "./model-catalog";
import { requireGeoProject } from "./projects";
import {
  addTokenUsage,
  askGroundedConversation,
  buildGeoScanCheckContext,
  EMPTY_TOKEN_USAGE,
  judgeAnswer,
  logGeoBillingFailure,
  MAX_JUDGE_COMPETITORS,
  normalizePosition,
  parseGeoClaimToken,
  renewGeoScanClaimIfDue,
  requireAnswerText,
} from "./scan";
import { claimGeoScanRun, withGeoScanRun } from "./scan-status";
import { resolveScanZdrPolicy } from "./zdr-policy";

interface PersonaForScan {
  persona: PersonaAgentPersona;
  memories: PersonaMemoryRecord[];
}

function personaFailureFields(
  context: GeoCheckContext,
  personaId: string,
  engine: string
): GeoSkipFields {
  return {
    event: "geo.check.failed",
    organizationId: context.organizationId,
    projectId: context.projectId,
    scanId: context.scanId,
    engine,
    promptId: personaPromptId(personaId),
    personaId,
    grounded: true,
  };
}

const loadPersonaForScan = Effect.fn("geo.persona.load")(function* (
  projectId: string,
  personaId: string
) {
  const row = yield* Effect.tryPromise({
    try: () =>
      db.query.geoPersonas.findFirst({
        where: and(
          eq(geoPersonas.id, personaId),
          eq(geoPersonas.projectId, projectId)
        ),
      }),
    catch: (cause) =>
      new GeoScanError({ message: "Failed to load the persona", cause }),
  });
  if (!row) {
    return null;
  }
  const memoryRows = yield* Effect.tryPromise({
    try: () =>
      db.query.geoPersonaMemories.findMany({
        where: eq(geoPersonaMemories.personaId, personaId),
        orderBy: [asc(geoPersonaMemories.createdAt)],
      }),
    catch: (cause) =>
      new GeoScanError({ message: "Failed to load persona memories", cause }),
  });
  const loaded: PersonaForScan = {
    persona: {
      id: row.id,
      name: row.name,
      role: row.role,
      company: row.company,
      summary: row.summary,
      searchStyle: row.searchStyle,
      profile: row.profile,
    },
    memories: memoryRows.map((memory) => ({
      id: memory.id,
      personaId: memory.personaId,
      projectId: memory.projectId,
      kind: memory.kind,
      content: memory.content,
    })),
  };
  return loaded;
});

const askPersonaNextTurn = Effect.fn("geo.persona.nextTurn")(function* (
  organizationId: string,
  loaded: PersonaForScan,
  engineLabel: string,
  transcript: readonly PersonaConversationTurn[],
  turnIndex: number
) {
  return yield* Effect.tryPromise({
    try: (signal) =>
      generatePersonaNextTurn(
        {
          organizationId,
          persona: loaded.persona,
          memories: loaded.memories,
          engineLabel,
          transcript,
          turnIndex,
          maxTurns: GEO_PERSONA_MAX_TURNS,
        },
        signal
      ),
    catch: (cause) =>
      new GeoScanError({
        message: `Persona ${loaded.persona.id} failed to write turn ${turnIndex + 1}`,
        cause,
      }),
  }).pipe(
    Effect.timeoutOrElse({
      duration: GEO_PERSONA_TURN_TIMEOUT_MS,
      orElse: () =>
        Effect.fail(
          new GeoScanError({
            message: `Persona ${loaded.persona.id} timed out writing turn ${turnIndex + 1}`,
          })
        ),
    })
  );
});

/**
 * Plays one persona against one search-grounded engine. The persona agent
 * writes each message from its fixed memories and the transcript so far; the
 * engine answers with web search; the judge scores every reply. Rows carry
 * `personaId` so they stay out of the prompt aggregates.
 */
export const runGeoPersonaConversation = Effect.fn(
  "geo.runPersonaConversation"
)(function* (
  context: GeoCheckContext,
  loaded: PersonaForScan,
  grounded: GeoGroundedEngine,
  zdr: GeoZdrMode
) {
  const rows: GeoCheckWrite[] = [];
  const messages: ModelMessage[] = [];
  const transcript: PersonaConversationTurn[] = [];
  const personaId = loaded.persona.id;
  const failureFields = personaFailureFields(context, personaId, grounded.key);
  let usage = EMPTY_TOKEN_USAGE;
  let droppedTurns = 0;

  for (let index = 0; index < GEO_PERSONA_MAX_TURNS; index += 1) {
    const next = yield* askPersonaNextTurn(
      context.organizationId,
      loaded,
      grounded.label,
      transcript,
      index
    );
    usage = addTokenUsage(usage, next.usage);
    if (!next.message) {
      break;
    }

    messages.push({ role: "user", content: next.message });
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
      personaPromptId(personaId),
      DEFAULT_LANGUAGE,
      answer
    ).pipe(
      Effect.catchTag("GeoEmptyAnswerError", (error) =>
        Effect.sync(() => {
          logGeoSkip(
            "persona turn failed",
            { ...failureFields, turn: index + 1 },
            error
          );
          return null;
        })
      )
    );
    if (answerText === null) {
      droppedTurns = GEO_PERSONA_MAX_TURNS - index;
      break;
    }
    messages.push({ role: "assistant", content: answerText });
    transcript.push({ question: next.message, answer: answerText });
    const judged = yield* judgeAnswer(context, next.message, answerText);

    rows.push({
      organizationId: context.organizationId,
      projectId: context.projectId,
      scanId: context.scanId,
      engine: grounded.key,
      promptId: personaPromptId(personaId),
      sequenceId: null,
      personaId,
      turn: index + 1,
      prompt: next.message,
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

  const outcome: GeoPersonaCheckOutcome = { rows, usage, droppedTurns };
  return outcome;
});

const runPlannedPersona = Effect.fn("geo.runPlannedPersona")(function* (
  checkContext: GeoCheckContext,
  planned: GeoScanPlannedPersona
) {
  const grounded = resolveGroundedEngineByKey(planned.groundedKey);
  if (!grounded) {
    return null;
  }
  const loaded = yield* loadPersonaForScan(
    checkContext.projectId,
    planned.personaId
  );
  if (!loaded) {
    return null;
  }
  return yield* runGeoPersonaConversation(
    checkContext,
    loaded,
    grounded,
    planned.zdr
  ).pipe(
    Effect.timeoutOrElse({
      duration: GEO_PERSONA_PAIR_TIMEOUT_MS,
      orElse: () =>
        Effect.fail(
          new GeoScanError({
            message: `Persona ${planned.personaId} on ${grounded.key} timed out after ${GEO_PERSONA_PAIR_TIMEOUT_MS}ms`,
          })
        ),
    })
  );
});

/** Runs one batch of persona conversations; same contract as `runGeoScanSequenceBatch`. */
export const runGeoScanPersonaBatch = Effect.fn("geo.runScanPersonaBatch")(
  function* (
    context: GeoScanProjectContext,
    plannedPersonas: readonly GeoScanPlannedPersona[],
    claimToken: string
  ) {
    const incoming = yield* parseGeoClaimToken(claimToken);
    const claimedAt = yield* renewGeoScanClaimIfDue(
      context.projectId,
      incoming
    );
    const checkContext = yield* buildGeoScanCheckContext(context);

    const outcomes = yield* Effect.forEach(
      plannedPersonas,
      (planned) =>
        runPlannedPersona(checkContext, planned).pipe(
          geoSkip(
            "persona conversation failed",
            personaFailureFields(
              checkContext,
              planned.personaId,
              planned.engine
            )
          )
        ),
      { concurrency: GEO_SCAN_CONCURRENCY }
    );

    const rows: GeoCheckWrite[] = [];
    let dropped = 0;
    let usage = EMPTY_TOKEN_USAGE;
    for (const outcome of outcomes) {
      if (!outcome) {
        dropped += GEO_PERSONA_MAX_TURNS;
        continue;
      }
      dropped += outcome.droppedTurns;
      rows.push(...outcome.rows);
      usage = addTokenUsage(usage, outcome.usage);
    }
    let checks = 0;
    let mentions = 0;
    if (rows.length > 0) {
      yield* Effect.tryPromise({
        try: () => insertGeoMentionChecks(rows),
        catch: (cause) =>
          new GeoScanError({ message: "Failed to store GEO checks", cause }),
      });
      checks = rows.length;
      mentions = rows.filter((row) => row.mentioned).length;
    }

    const result: GeoScanBatchOutcome = {
      checks,
      mentions,
      dropped,
      usage,
      claimedAt: claimedAt.toISOString(),
    };
    return result;
  }
);

/**
 * Plays one persona against every available grounded engine right away,
 * outside the scheduled scan. Mirrors `runGeoSequenceNow`: its own
 * `geo_scans` row, its own billing reservation, and the project scan slot
 * when it is free.
 */
const runGeoPersonaNowProgram = Effect.fn("geo.runPersonaNow")(function* (
  input: GeoScopeInput,
  personaId: string
) {
  const billing = yield* GeoContentBillingService;
  const scope = yield* requireGeoProject(input);
  const projectId = scope.projectId;

  const loaded = yield* loadPersonaForScan(projectId, personaId).pipe(
    Effect.mapError(
      (error) =>
        new GeoPersonaRunError({ message: error.message, cause: error.cause })
    )
  );
  if (!loaded) {
    return yield* Effect.fail(new GeoPersonaNotFoundError({ personaId }));
  }

  const settingsRow = yield* Effect.tryPromise({
    try: () =>
      db.query.geoSettings.findFirst({
        where: eq(geoSettings.projectId, projectId),
      }),
    catch: (cause) =>
      new GeoPersonaRunError({
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
    { projectId, personaId }
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
        personaId,
        engine: grounded.key,
      });
      continue;
    }
    groundedEngines.push({ grounded, zdr });
  }
  if (groundedEngines.length === 0) {
    return yield* Effect.fail(new GeoPersonaRunUnavailableError({}));
  }

  const runId = `geo-persona-${personaId}-${crypto.randomUUID()}`;
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
          new GeoPersonaRunError({
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
          groundedEngines,
          ({ grounded, zdr }) =>
            runGeoPersonaConversation(context, loaded, grounded, zdr).pipe(
              geoSkip(
                "persona run failed",
                personaFailureFields(context, personaId, grounded.key)
              )
            ),
          { concurrency: GEO_SCAN_CONCURRENCY }
        );
        const succeeded = outcomes.filter(
          (outcome): outcome is GeoPersonaCheckOutcome => outcome !== null
        );
        const rows = succeeded.flatMap((outcome) => outcome.rows);
        const usage = succeeded.reduce(
          (total, outcome) => addTokenUsage(total, outcome.usage),
          EMPTY_TOKEN_USAGE
        );
        if (rows.length === 0) {
          return yield* Effect.fail(new GeoPersonaEmptyError({ usage }));
        }
        yield* Effect.tryPromise({
          try: () => insertGeoMentionChecks(rows),
          catch: (cause) =>
            new GeoPersonaRunError({
              message: "Failed to store the persona results",
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
        fallbackModelId: groundedEngines[0]?.grounded.model ?? GEO_JUDGE_MODEL,
        properties: {
          source: "geo_persona_run",
          run_id: runId,
          persona_id: personaId,
          markup_applied: gate.useMarkup,
        },
        logPrefix: "GeoPersonaRun",
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
      error._tag === "GeoPersonaEmptyError"
        ? confirmBilling(0, error.usage)
        : billing
            .finalizeContentBilling({
              reservation: gate,
              action: "release",
              logPrefix: "GeoPersonaRun",
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
    Effect.catchTag("GeoPersonaEmptyError", () =>
      Effect.fail(
        new GeoPersonaRunError({
          message: "Engines failed to answer this persona. Try again.",
        })
      )
    )
  );

  yield* confirmBilling(result.rows.length, result.usage);

  const response: GeoPersonaRunResponse = {
    checks: result.rows.length,
    mentions: result.rows.filter((row) => row.mentioned).length,
    engines: groundedEngines.map(({ grounded }) => grounded.key),
  };
  return response;
});

export function runGeoPersonaNow(input: GeoScopeInput, personaId: string) {
  return runGeoPersonaNowProgram(input, personaId).pipe(
    Effect.ensuring(flushGeoLogEffect)
  );
}
