import { describeContentBillingDenial } from "@notra/ai/billing/content-billing";
import { FEATURES } from "@notra/ai/billing/features";
import { DEFAULT_LANGUAGE } from "@notra/ai/constants/languages";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import { db } from "@notra/db/drizzle";
import { geoAdhocScans, geoSettings } from "@notra/db/schema";
import type {
  GeoAdhocScanCheck,
  GeoAdhocScanInput,
  GeoAdhocScanResults,
} from "@notra/db/types/geo-adhoc-scan";
import type { GeoCheckWrite } from "@notra/db/types/geo-checks";
import { and, eq, inArray, lt, or } from "drizzle-orm";
import { Effect, Schedule } from "effect";

import {
  GEO_ADHOC_SCAN_IDEMPOTENCY_KEY_MAX_LENGTH,
  GEO_ADHOC_SCAN_MAX_ENGINES,
  GEO_ADHOC_SCAN_HEARTBEAT_MS,
  GEO_ADHOC_SCAN_QUEUED_STALE_MS,
  GEO_ADHOC_SCAN_RUNNING_STALE_MS,
  GEO_JUDGE_MODEL,
  GEO_PROMPT_MAX_LENGTH,
  GEO_SCAN_CONCURRENCY,
} from "../constants/geo";
import { GeoContentBillingService } from "../deps";
import type {
  GeoCheckContext,
  GeoCheckTask,
  GeoScopeInput,
} from "../types/geo";
import { logGeoBillingFailure } from "../utils/geo-billing-log";
import {
  isGeoNativeSearchEngine,
  resolveGeoGroundedZdrMode,
  resolveGeoZdrMode,
} from "../utils/geo-engines";
import { resolveGroundedEngines } from "../utils/geo-grounded-engines";
import { isSupportedGeoLanguage } from "../utils/geo-language-rows";
import { flushGeoLogEffect, geoLogWarn } from "../utils/geo-log";
import {
  addAgentTokenUsage,
  EMPTY_AGENT_TOKEN_USAGE,
} from "../utils/token-usage";
import { geoDb } from "./effect";
import {
  GeoAdhocScanConflictError,
  GeoAdhocScanInvalidError,
  GeoAdhocScanNotFoundError,
  GeoAdhocScanUnavailableError,
  GeoScanError,
  GeoSettingsMissingError,
  GeoWriterCreditsExhaustedError,
} from "./errors";
import { toGeoSettings } from "./mappers";
import { loadGeoModelCatalog } from "./model-catalog";
import { loadGeoProjectBrand } from "./project-brand";
import { requireGeoProject } from "./projects";
import { runGeoCheckAttempt } from "./scan";
import { resolveScanZdrPolicy } from "./zdr-policy";

type GeoAdhocScanSkip = GeoAdhocScanResults["skipped"][number];

export interface GeoAdhocScanRequest extends GeoScopeInput {
  idempotencyKey: string;
  prompt: string;
  engines: readonly string[];
  webSearch?: boolean;
  language?: string;
}

function adhocPromptId(scanId: string): string {
  return `adhoc-${scanId}`;
}

function toAdhocCheck(row: GeoCheckWrite): GeoAdhocScanCheck {
  return {
    engine: row.engine,
    prompt: row.prompt,
    answer: row.answer,
    mentioned: row.mentioned,
    ownedSourceCited: row.ownedSourceCited,
    position: row.position,
    sentiment: row.sentiment,
    competitors: row.competitors,
    excerpt: row.excerpt,
    grounding: row.grounding,
    sources: row.sources ?? [],
    language: row.language,
    finishReason: row.finishReason,
    promptTokens: row.promptTokens,
    outputTokens: row.outputTokens,
    reasoningTokens: row.reasoningTokens,
    zdrEnforced: row.zdrEnforced ?? null,
    capturedAt: row.capturedAt.toISOString(),
  };
}

/**
 * Validates a one-off scan and stores it as `queued`. Nothing paid happens
 * here, so any host can accept the request and hand the id to the runner.
 */
export const createGeoAdhocScan = Effect.fn("geo.createAdhocScan")(function* (
  request: GeoAdhocScanRequest
) {
  const scope = yield* requireGeoProject(request);
  const idempotencyKey = request.idempotencyKey.trim();
  if (
    idempotencyKey.length === 0 ||
    idempotencyKey.length > GEO_ADHOC_SCAN_IDEMPOTENCY_KEY_MAX_LENGTH
  ) {
    return yield* Effect.fail(
      new GeoAdhocScanInvalidError({
        message: `Idempotency-Key must be between 1 and ${GEO_ADHOC_SCAN_IDEMPOTENCY_KEY_MAX_LENGTH} characters`,
      })
    );
  }
  const prompt = request.prompt.trim();
  if (prompt.length === 0 || prompt.length > GEO_PROMPT_MAX_LENGTH) {
    return yield* Effect.fail(
      new GeoAdhocScanInvalidError({
        message: `Prompt must be between 1 and ${GEO_PROMPT_MAX_LENGTH} characters`,
      })
    );
  }
  const engines = [...new Set(request.engines)];
  if (engines.length === 0 || engines.length > GEO_ADHOC_SCAN_MAX_ENGINES) {
    return yield* Effect.fail(
      new GeoAdhocScanInvalidError({
        message: `Pick between 1 and ${GEO_ADHOC_SCAN_MAX_ENGINES} models`,
      })
    );
  }
  const catalog = yield* loadGeoModelCatalog(scope.organizationId);
  const known = new Set(
    catalog.models.flatMap((model) => (model.hidden ? [] : [model.id]))
  );
  const unknown = engines.filter((engine) => !known.has(engine));
  if (unknown.length > 0) {
    return yield* Effect.fail(
      new GeoAdhocScanInvalidError({
        message: `Unknown models: ${unknown.join(", ")}`,
      })
    );
  }

  const language = request.language ?? DEFAULT_LANGUAGE;
  if (!isSupportedGeoLanguage(language)) {
    return yield* Effect.fail(
      new GeoAdhocScanInvalidError({ message: "Unsupported language" })
    );
  }

  const input: GeoAdhocScanInput = {
    prompt,
    engines,
    webSearch: request.webSearch ?? true,
    language,
  };
  const id = crypto.randomUUID();
  const [created] = yield* geoDb("adhoc scan insert failed", () =>
    db
      .insert(geoAdhocScans)
      .values({
        id,
        organizationId: scope.organizationId,
        projectId: scope.projectId,
        idempotencyKey,
        input,
      })
      .onConflictDoNothing()
      .returning({ id: geoAdhocScans.id, status: geoAdhocScans.status })
  );
  if (created) {
    return { ...created, created: true } as const;
  }

  const existing = yield* geoDb("adhoc scan idempotency lookup failed", () =>
    db.query.geoAdhocScans.findFirst({
      where: and(
        eq(geoAdhocScans.organizationId, scope.organizationId),
        eq(geoAdhocScans.idempotencyKey, idempotencyKey)
      ),
    })
  );
  if (!existing) {
    return yield* Effect.fail(
      new GeoScanError({ message: "Idempotent scan could not be loaded" })
    );
  }
  const sameRequest =
    existing.projectId === scope.projectId &&
    existing.input.prompt === input.prompt &&
    existing.input.webSearch === input.webSearch &&
    existing.input.language === input.language &&
    existing.input.engines.length === input.engines.length &&
    existing.input.engines.every(
      (engine, index) => engine === input.engines[index]
    );
  if (!sameRequest) {
    return yield* Effect.fail(
      new GeoAdhocScanConflictError({
        message: "Idempotency-Key was already used for a different scan",
      })
    );
  }
  return { id: existing.id, status: existing.status, created: false } as const;
});

export const listGeoAdhocScanModels = Effect.fn("geo.listAdhocScanModels")(
  function* (input: GeoScopeInput) {
    const scope = yield* requireGeoProject(input);
    const catalog = yield* loadGeoModelCatalog(scope.organizationId);
    return catalog.models
      .filter((model) => !model.hidden)
      .map((model) => ({
        id: model.id,
        label: model.label,
        provider: model.provider,
        default: model.default,
        supportsWebSearch:
          Boolean(model.supportsGroundedChecks) ||
          isGeoNativeSearchEngine(catalog, model.id),
      }));
  }
);

export const getGeoAdhocScan = Effect.fn("geo.getAdhocScan")(function* (
  input: GeoScopeInput,
  scanId: string
) {
  const scope = yield* requireGeoProject(input);
  const row = yield* geoDb("adhoc scan lookup failed", () =>
    db.query.geoAdhocScans.findFirst({
      where: and(
        eq(geoAdhocScans.id, scanId),
        eq(geoAdhocScans.projectId, scope.projectId)
      ),
    })
  );
  if (!row) {
    return yield* Effect.fail(new GeoAdhocScanNotFoundError({ scanId }));
  }
  const { idempotencyKey: _, ...scan } = row;
  return scan;
});

/** Fails queued scans this process accepted but will not run, such as on shutdown. */
export const interruptQueuedGeoAdhocScans = Effect.fn(
  "geo.interruptQueuedAdhocScans"
)(function* (scanIds: readonly string[]) {
  if (scanIds.length === 0) {
    return 0;
  }
  const rows = yield* geoDb("adhoc scan interrupt failed", () =>
    db
      .update(geoAdhocScans)
      .set({
        status: "failed",
        errorCode: "interrupted",
        errorMessage: "The scan was interrupted. Try again.",
        retryable: true,
        finishedAt: new Date(),
      })
      .where(
        and(
          inArray(geoAdhocScans.id, [...scanIds]),
          eq(geoAdhocScans.status, "queued")
        )
      )
      .returning({ id: geoAdhocScans.id })
  );
  return rows.length;
});

export const requireQueuedGeoAdhocScan = Effect.fn(
  "geo.requireQueuedAdhocScan"
)(function* (scanId: string) {
  const row = yield* geoDb("adhoc scan run lookup failed", () =>
    db.query.geoAdhocScans.findFirst({
      columns: { id: true, status: true },
      where: eq(geoAdhocScans.id, scanId),
    })
  );
  if (!row) {
    return yield* Effect.fail(new GeoAdhocScanNotFoundError({ scanId }));
  }
  if (row.status !== "queued") {
    return yield* Effect.fail(
      new GeoAdhocScanConflictError({
        message: "Only a queued scan can be run",
      })
    );
  }
  return row.id;
});

export const discardQueuedGeoAdhocScan = Effect.fn(
  "geo.discardQueuedAdhocScan"
)(function* (scanId: string) {
  const rows = yield* geoDb("adhoc scan discard failed", () =>
    db
      .delete(geoAdhocScans)
      .where(
        and(eq(geoAdhocScans.id, scanId), eq(geoAdhocScans.status, "queued"))
      )
      .returning({ id: geoAdhocScans.id })
  );
  return rows.length > 0;
});

const finishGeoAdhocScan = (
  scanId: string,
  outcome:
    | { status: "completed"; results: GeoAdhocScanResults }
    | {
        status: "failed";
        errorCode: string;
        errorMessage: string;
        retryable: boolean;
        results?: GeoAdhocScanResults;
      }
) =>
  geoDb("adhoc scan finish failed", () =>
    db
      .update(geoAdhocScans)
      .set({ ...outcome, finishedAt: new Date() })
      .where(
        and(eq(geoAdhocScans.id, scanId), eq(geoAdhocScans.status, "running"))
      )
  );

function planAdhocTasks(
  context: GeoCheckContext,
  input: GeoAdhocScanInput,
  zdrPolicy: Parameters<typeof resolveGeoZdrMode>[2]
): { tasks: GeoCheckTask[]; skipped: GeoAdhocScanSkip[] } {
  const prompt = { id: adhocPromptId(context.scanId), text: input.prompt };
  const tasks: GeoCheckTask[] = [];
  const skipped: GeoAdhocScanSkip[] = [];
  for (const engine of input.engines) {
    const bare =
      !input.webSearch || isGeoNativeSearchEngine(context.catalog, engine);
    if (bare) {
      const zdr = resolveGeoZdrMode(context.catalog, engine, zdrPolicy);
      if (zdr === null) {
        skipped.push({ engine, reason: "zdr" });
        continue;
      }
      tasks.push({
        engine,
        grounded: null,
        prompt,
        language: input.language,
        zdr,
      });
      continue;
    }
    const groundedEngines = resolveGroundedEngines([engine], context.catalog);
    if (groundedEngines.length === 0) {
      skipped.push({ engine, reason: "no_web_search" });
      continue;
    }
    for (const grounded of groundedEngines) {
      const zdr = resolveGeoGroundedZdrMode(
        context.catalog,
        grounded,
        zdrPolicy
      );
      if (zdr === null) {
        skipped.push({ engine: grounded.key, reason: "zdr" });
        continue;
      }
      tasks.push({
        engine: grounded.key,
        grounded,
        prompt,
        language: input.language,
        zdr,
      });
    }
  }
  return { tasks, skipped };
}

const runClaimedGeoAdhocScan = Effect.fn("geo.runClaimedAdhocScan")(function* (
  row: typeof geoAdhocScans.$inferSelect
) {
  const billing = yield* GeoContentBillingService;
  const { organizationId, projectId, id: scanId } = row;
  const runId = `geo-adhoc-${scanId}`;

  const settingsRow = yield* geoDb("adhoc scan settings lookup failed", () =>
    db.query.geoSettings.findFirst({
      where: eq(geoSettings.projectId, projectId),
    })
  );
  if (!settingsRow) {
    return yield* Effect.fail(new GeoSettingsMissingError({ organizationId }));
  }
  const catalog = yield* loadGeoModelCatalog(organizationId);
  const settings = toGeoSettings(settingsRow, catalog);
  const brand = yield* loadGeoProjectBrand({ organizationId, projectId });
  const zdrPolicy = yield* resolveScanZdrPolicy(organizationId, settings, {
    projectId,
    scanId,
  });

  const context: GeoCheckContext = {
    organizationId,
    projectId,
    scanId,
    runId,
    catalog,
    capturedAt: new Date(),
    companyName: settings.companyName,
    aliases: settings.aliases,
    websiteUrl: brand?.websiteUrl ?? null,
    domains: settings.domains,
  };
  const { tasks, skipped } = planAdhocTasks(context, row.input, zdrPolicy);
  for (const skip of skipped) {
    yield* geoLogWarn({
      event: "geo.scan.skipped",
      reason: skip.reason,
      organizationId,
      projectId,
      scanId,
      engine: skip.engine,
    });
  }
  if (tasks.length === 0) {
    return yield* Effect.fail(
      new GeoAdhocScanUnavailableError({
        message: "None of the selected models can run this scan",
      })
    );
  }

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
        fallbackModelId: tasks[0]?.grounded?.model ?? GEO_JUDGE_MODEL,
        properties: {
          source: "geo_adhoc_scan",
          scan_id: scanId,
          project_id: projectId,
          run_id: runId,
          markup_applied: gate.useMarkup,
        },
        logPrefix: "GeoAdhocScan",
      })
      .pipe(
        Effect.catch((error) =>
          Effect.sync(() =>
            logGeoBillingFailure(action, projectId, runId, error)
          )
        )
      );

  let settled = false;
  return yield* Effect.gen(function* () {
    const outcomes = yield* Effect.forEach(
      tasks,
      (task) =>
        runGeoCheckAttempt(context, task).pipe(
          Effect.map((outcome) => ({ task, outcome }))
        ),
      { concurrency: GEO_SCAN_CONCURRENCY }
    );
    const checks: GeoAdhocScanCheck[] = [];
    let usage = EMPTY_AGENT_TOKEN_USAGE;
    for (const { task, outcome } of outcomes) {
      if (outcome) {
        usage = addAgentTokenUsage(usage, outcome.usage);
      }
      if (outcome?.row) {
        checks.push(toAdhocCheck(outcome.row));
      } else {
        skipped.push({ engine: task.engine, reason: "failed" });
      }
    }
    settled = true;
    const hasUsage =
      usage.inputTokens > 0 ||
      usage.outputTokens > 0 ||
      usage.totalTokens > 0 ||
      usage.cacheReadTokens > 0 ||
      usage.cacheWriteTokens > 0 ||
      (usage.totalUsd ?? 0) > 0;
    yield* checks.length > 0 || hasUsage
      ? settle("confirm", checks.length, usage)
      : settle("release");
    const results: GeoAdhocScanResults = { checks, skipped };
    return results;
  }).pipe(
    Effect.ensuring(
      Effect.suspend(() => (settled ? Effect.void : settle("release")))
    )
  );
});

/**
 * Runs a queued one-off scan to completion. The `queued → running` update is
 * the claim: a second runner handed the same id finds nothing to take and
 * returns `null`. Never touches the project's scheduled-scan claim, and every
 * outcome — including a denial — ends up on the row for the poller.
 */
export const executeGeoAdhocScan = (scanId: string) =>
  Effect.gen(function* () {
    const [row] = yield* geoDb("adhoc scan claim failed", () =>
      db
        .update(geoAdhocScans)
        .set({
          status: "running",
          startedAt: new Date(),
          heartbeatAt: new Date(),
        })
        .where(
          and(eq(geoAdhocScans.id, scanId), eq(geoAdhocScans.status, "queued"))
        )
        .returning()
    );
    if (!row) {
      return null;
    }
    return yield* Effect.scoped(
      Effect.gen(function* () {
        const heartbeat = geoDb("adhoc scan heartbeat failed", () =>
          db
            .update(geoAdhocScans)
            .set({ heartbeatAt: new Date() })
            .where(
              and(
                eq(geoAdhocScans.id, scanId),
                eq(geoAdhocScans.status, "running")
              )
            )
        ).pipe(
          Effect.catch((error) =>
            Effect.logError("adhoc scan heartbeat failed", { scanId, error })
          ),
          Effect.repeat(Schedule.spaced(GEO_ADHOC_SCAN_HEARTBEAT_MS))
        );
        yield* Effect.forkScoped(heartbeat);

        return yield* runClaimedGeoAdhocScan(row).pipe(
          Effect.matchEffect({
            onSuccess: (results) =>
              results.checks.length > 0
                ? finishGeoAdhocScan(scanId, { status: "completed", results })
                : finishGeoAdhocScan(scanId, {
                    status: "failed",
                    errorCode: "no_answers",
                    errorMessage:
                      "Models failed to answer this prompt. Try again.",
                    retryable: true,
                    results,
                  }),
            onFailure: (error) =>
              finishGeoAdhocScan(scanId, {
                status: "failed",
                errorCode: adhocErrorCode(error),
                errorMessage:
                  "message" in error && typeof error.message === "string"
                    ? error.message
                    : "The scan could not be completed",
                retryable:
                  error._tag === "GeoDatabaseError" ||
                  error._tag === "GeoScanError",
              }),
          }),
          // A redeploy interrupts in-flight scans; say so now rather than leaving
          // the row for the stale sweep.
          Effect.onInterrupt(() =>
            finishGeoAdhocScan(scanId, {
              status: "failed",
              errorCode: "interrupted",
              errorMessage: "The scan was interrupted. Try again.",
              retryable: true,
            }).pipe(Effect.ignore)
          ),
          Effect.as(scanId)
        );
      })
    );
  }).pipe(Effect.ensuring(flushGeoLogEffect));

function adhocErrorCode(error: { readonly _tag?: string }): string {
  switch (error._tag) {
    case "GeoWriterCreditsExhaustedError":
      return "credits_exhausted";
    case "GeoAdhocScanUnavailableError":
      return "no_runnable_models";
    case "GeoSettingsMissingError":
      return "settings_missing";
    default:
      return "execution_failed";
  }
}

/**
 * Fails scans whose runner disappeared: `running` past the stale window, or
 * `queued` that long without ever being picked up. Their billing locks expire
 * on their own TTL.
 */
export const failStaleGeoAdhocScans = Effect.fn("geo.failStaleAdhocScans")(
  function* (now = new Date()) {
    const runningCutoff = new Date(
      now.getTime() - GEO_ADHOC_SCAN_RUNNING_STALE_MS
    );
    const queuedCutoff = new Date(
      now.getTime() - GEO_ADHOC_SCAN_QUEUED_STALE_MS
    );
    const rows = yield* geoDb("adhoc scan stale sweep failed", () =>
      db
        .update(geoAdhocScans)
        .set({
          status: "failed",
          errorCode: "stale",
          errorMessage: "The scan was interrupted. Try again.",
          retryable: true,
          finishedAt: now,
        })
        .where(
          or(
            and(
              eq(geoAdhocScans.status, "running"),
              lt(geoAdhocScans.heartbeatAt, runningCutoff)
            ),
            and(
              eq(geoAdhocScans.status, "queued"),
              lt(geoAdhocScans.createdAt, queuedCutoff)
            )
          )
        )
        .returning({ id: geoAdhocScans.id })
    );
    return rows.length;
  }
);
