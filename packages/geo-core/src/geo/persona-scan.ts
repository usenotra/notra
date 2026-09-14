import { db } from "@notra/db/drizzle";
import { geoPersonaMemories, geoPersonas, geoSettings } from "@notra/db/schema";
import type { GeoCheckWrite } from "@notra/db/types/geo-checks";
import type { GeoPersonaSnapshotV2 } from "@notra/db/types/geo-personas";
import { insertGeoMentionChecks } from "@notra/db/utils/geo-checks";
import { and, asc, eq } from "drizzle-orm";
import { Effect } from "effect";

import { GEO_JUDGE_MODEL, GEO_SCAN_CONCURRENCY } from "../constants/geo";
import {
  GEO_PERSONA_MAX_TURNS,
  GEO_PERSONA_PAIR_TIMEOUT_MS,
} from "../constants/geo-personas";
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
  GeoPersonaMemory,
  GeoPersonaRunResponse,
} from "../types/geo-personas";
import { resolveGeoGroundedZdrMode } from "../utils/geo-engines";
import {
  resolveGroundedEngineByKey,
  resolveGroundedEngines,
} from "../utils/geo-grounded-engines";
import { flushGeoLogEffect, geoLogWarn } from "../utils/geo-log";
import { personaPromptId } from "../utils/geo-personas";
import { geoScanPersonaTasks } from "../utils/geo-scan-plan";
import { createPersonaSnapshot } from "../utils/persona-snapshot";
import {
  addAgentTokenUsage as addTokenUsage,
  EMPTY_AGENT_TOKEN_USAGE as EMPTY_TOKEN_USAGE,
} from "../utils/token-usage";
import { runGeoConversation } from "./conversation";
import { runGeoConversationReplay } from "./conversation-replay";
import { geoSkip } from "./effect";
import {
  GeoPersonaNotFoundError,
  GeoPersonaRunError,
  GeoPersonaRunUnavailableError,
  GeoScanError,
  GeoSettingsMissingError,
} from "./errors";
import { toGeoSettings } from "./mappers";
import { loadGeoModelCatalog } from "./model-catalog";
import { loadGeoProjectBrand } from "./project-brand";
import { requireGeoProject } from "./projects";
import { buildGeoScanCheckContext } from "./scan-context";
import { omitGeoScanTasks, updateGeoScanTaskStatus } from "./scan-task-status";
import { resolveScanZdrPolicy } from "./zdr-policy";

interface PersonaForScan {
  persona: GeoPersonaSnapshotV2["persona"];
  memories: GeoPersonaMemory[];
  conversationPrompts: string[];
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
        orderBy: [
          asc(geoPersonaMemories.createdAt),
          asc(geoPersonaMemories.id),
        ],
      }),
    catch: (cause) =>
      new GeoScanError({ message: "Failed to load persona memories", cause }),
  });
  const loaded: PersonaForScan & { enabled: boolean } = {
    enabled: row.enabled,
    persona: {
      id: row.id,
      name: row.name,
      role: row.role,
      company: row.company,
      summary: row.summary,
      searchStyle: row.searchStyle,
      profile: row.profile,
    },
    conversationPrompts: row.conversationPrompts,
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

/**
 * Plays one persona's fixed prompts against one search-grounded engine. Rows
 * carry `personaId` so they stay out of the prompt aggregates.
 */
export const runGeoPersonaConversation = Effect.fn(
  "geo.runPersonaConversation"
)(function* (
  context: GeoCheckContext,
  loaded: PersonaForScan,
  prompts: readonly string[],
  grounded: GeoGroundedEngine,
  zdr: GeoZdrMode
) {
  const conversationPrompts = prompts.slice(0, GEO_PERSONA_MAX_TURNS);
  const snapshot = createPersonaSnapshot(
    loaded.persona,
    loaded.memories,
    conversationPrompts
  );
  return yield* runGeoConversation(
    context,
    {
      promptId: personaPromptId(loaded.persona.id),
      personaId: loaded.persona.id,
      maxTurns: conversationPrompts.length,
      timeoutMs: GEO_PERSONA_PAIR_TIMEOUT_MS,
      next: (_transcript, index) =>
        Effect.succeed({
          message: conversationPrompts[index] ?? null,
          usage: EMPTY_TOKEN_USAGE,
          snapshot,
        }),
    },
    grounded,
    zdr
  );
});

const runPlannedPersona = Effect.fn("geo.runPlannedPersona")(function* (
  checkContext: GeoCheckContext,
  planned: GeoScanPlannedPersona
) {
  const tasks = geoScanPersonaTasks(planned);
  const grounded = resolveGroundedEngineByKey(planned.groundedKey);
  if (!grounded) {
    yield* omitGeoScanTasks(
      checkContext,
      tasks.map((task) => task.key)
    ).pipe(geoSkip("scan plan update failed"));
    return null;
  }
  const loaded = yield* loadPersonaForScan(
    checkContext.projectId,
    planned.personaId
  );
  if (!loaded || !loaded.enabled) {
    yield* omitGeoScanTasks(
      checkContext,
      tasks.map((task) => task.key)
    ).pipe(geoSkip("scan plan update failed"));
    return null;
  }
  yield* Effect.forEach(
    tasks,
    (task) =>
      updateGeoScanTaskStatus(
        checkContext,
        {
          prompt: { id: task.promptId, text: task.prompt },
          engine: task.engine,
          language: task.language,
        },
        "running",
        task.turn
      ),
    { concurrency: GEO_SCAN_CONCURRENCY }
  );
  const outcome = yield* runGeoPersonaConversation(
    checkContext,
    loaded,
    planned.prompts ?? [],
    grounded,
    planned.zdr
  );
  const remaining = tasks.slice(outcome.rows.length);
  if (outcome.stoppedEarly) {
    yield* omitGeoScanTasks(
      checkContext,
      remaining.map((task) => task.key)
    ).pipe(geoSkip("scan plan update failed"));
  } else {
    yield* Effect.forEach(
      remaining,
      (task) =>
        updateGeoScanTaskStatus(
          checkContext,
          {
            prompt: { id: task.promptId, text: task.prompt },
            engine: task.engine,
            language: task.language,
          },
          "failed",
          task.turn
        ),
      { concurrency: GEO_SCAN_CONCURRENCY }
    );
  }
  return outcome;
});

/** Runs one batch of persona conversations; same contract as `runGeoScanSequenceBatch`. */
export const runGeoScanPersonaBatch = Effect.fn("geo.runScanPersonaBatch")(
  function* (
    context: GeoScanProjectContext,
    plannedPersonas: readonly GeoScanPlannedPersona[]
  ) {
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
    for (const [index, outcome] of outcomes.entries()) {
      if (!outcome) {
        const planned = plannedPersonas[index];
        dropped += planned ? geoScanPersonaTasks(planned).length : 0;
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
  if (!loaded.enabled || loaded.conversationPrompts.length === 0) {
    return yield* Effect.fail(new GeoPersonaRunUnavailableError({}));
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
  const brand = yield* loadGeoProjectBrand({
    organizationId: scope.organizationId,
    projectId,
  });
  const result = yield* runGeoConversationReplay(
    {
      context: {
        runId,
        organizationId: scope.organizationId,
        projectId,
        catalog,
        companyName: settings.companyName,
        aliases: settings.aliases,
        websiteUrl: brand?.websiteUrl ?? null,
        domains: settings.domains,
      },
      fallbackModelId: groundedEngines[0]?.grounded.model ?? GEO_JUDGE_MODEL,
      properties: { source: "geo_persona_run", persona_id: personaId },
      logPrefix: "GeoPersonaRun",
      emptyMessage: "Engines failed to answer this persona. Try again.",
    },
    (context) =>
      Effect.forEach(
        groundedEngines,
        ({ grounded, zdr }) =>
          runGeoPersonaConversation(
            context,
            loaded,
            loaded.conversationPrompts,
            grounded,
            zdr
          ).pipe(
            geoSkip(
              "persona run failed",
              personaFailureFields(context, personaId, grounded.key)
            )
          ),
        { concurrency: GEO_SCAN_CONCURRENCY }
      )
  ).pipe(
    Effect.mapError((error) =>
      error._tag === "GeoWriterCreditsExhaustedError"
        ? error
        : new GeoPersonaRunError({ message: error.message, cause: error })
    )
  );

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
