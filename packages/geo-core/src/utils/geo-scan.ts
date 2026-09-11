import { DEFAULT_LANGUAGE } from "@notra/ai/constants/languages";

import {
  GEO_OPENCODE_ENGINE_ID,
  GEO_GROUNDED_MAX_PROMPTS,
  GEO_LANGUAGE_MAX_PROMPTS,
  GEO_LANGUAGE_GROUNDED_MAX_PROMPTS,
  GEO_MAX_LANGUAGES,
  GEO_MAX_SEQUENCES,
  GEO_SEQUENCE_MAX_TURNS,
  GEO_SCAN_HOURS_PER_DAY,
  GEO_SCAN_INTERVAL_FALLBACK_NOUN,
  GEO_SCAN_INTERVAL_LABEL_PREFIX,
  GEO_SCAN_INTERVAL_OPTIONS,
  GEO_SCAN_SIZE_DANGER_THRESHOLD,
  GEO_SCAN_SIZE_WARN_THRESHOLD,
  GEO_SCAN_STALE_MS,
} from "../constants/geo";
import type {
  GeoEngineAttemptSummary,
  GeoScanSizeInput,
  GeoScanSizeSeverity,
} from "../types/geo";
import { isGeoBoxCodingAgent } from "./geo-coding-agents";

function toTimestamp(value: Date | string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isGeoScanRunning(
  scanStartedAt: Date | string | null | undefined,
  lastScanAt: Date | string | null | undefined,
  now = Date.now(),
  staleMs = GEO_SCAN_STALE_MS
): boolean {
  const startedAt = toTimestamp(scanStartedAt);
  if (startedAt === null || now - startedAt > staleMs) {
    return false;
  }
  const finishedAt = toTimestamp(lastScanAt);
  return finishedAt === null || startedAt > finishedAt;
}

export function geoScanEmptyMessage(
  isScanning: boolean,
  idleMessage: string
): string {
  return isScanning ? "Scanning engines…" : idleMessage;
}

/**
 * Non-2xx answer from the dashboard's internal workflow route
 * (`InternalDashboardError` in `apps/api`), matched by name because the class
 * lives in the host and cannot be imported here.
 */
const HANDOFF_REJECTED_ERROR_NAME = "InternalDashboardError";

/**
 * Failures raised while the connection was still being established, so the
 * request bytes provably never reached the dashboard. `EAI_AGAIN` and
 * `ENOTFOUND` are DNS, `ECONNREFUSED` is a closed port, and
 * `UND_ERR_CONNECT_TIMEOUT` is undici giving up before the socket opened.
 * Anything later (a reset mid-flight, a headers/body timeout, an aborted wait)
 * is deliberately absent: the workflow may well have been accepted.
 */
const HANDOFF_REJECTED_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
]);

const MAX_CAUSE_DEPTH = 5;

function hasRejectedShape(error: Error): boolean {
  if (error.name === HANDOFF_REJECTED_ERROR_NAME) {
    return true;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && HANDOFF_REJECTED_ERROR_CODES.has(code);
}

/**
 * Answers whether a failed scan hand-off *definitely* never started a run.
 *
 * Only a definite "no" may release the claim. On an ambiguous outcome — a
 * timeout or a dropped socket after the request went out, a 2xx whose body we
 * could not read — the workflow may be running right now, and releasing would
 * let the next trigger start a second scan the organization pays for. Leaving
 * the claim to go stale costs at most one blocked retry window instead.
 *
 * Errors nest (`GeoScanStartError.cause` → `TypeError` → undici cause), so the
 * chain is walked, bounded against a cyclic `cause`.
 */
export function isDefiniteGeoScanHandoffRejection(cause: unknown): boolean {
  let current = cause;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (!(current instanceof Error)) {
      return false;
    }
    if (hasRejectedShape(current)) {
      return true;
    }
    current = current.cause;
  }
  return false;
}

/**
 * Reorders planned checks so consecutive items rotate through engines instead
 * of exhausting one engine's prompts before moving on. The planner emits tasks
 * engine-major, so without this a wave of parallel batches would fire every
 * prompt of the same two or three models at once and trip provider rate
 * limits, while the rest of the catalog sat idle.
 */
export function interleaveGeoScanItemsByKey<T>(
  items: readonly T[],
  keyOf: (item: T) => string
): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  const queues = [...groups.values()];
  const interleaved: T[] = [];
  for (let index = 0; interleaved.length < items.length; index += 1) {
    for (const queue of queues) {
      const item = queue[index];
      if (item !== undefined) {
        interleaved.push(item);
      }
    }
  }
  return interleaved;
}

export function chunkGeoScanItems<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function describeGeoScanFailure(error: unknown): string {
  if (error instanceof Error && error.name.length > 0) {
    return error.name;
  }
  return "unknown";
}

/** "day", "3 days", "36 hours" — the noun that follows "every". */
export function geoScanIntervalNoun(intervalHours: number): string {
  const option = GEO_SCAN_INTERVAL_OPTIONS.find(
    (entry) => entry.value === intervalHours
  );
  if (option) {
    return option.label
      .replace(GEO_SCAN_INTERVAL_LABEL_PREFIX, "")
      .toLowerCase();
  }
  if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
    return GEO_SCAN_INTERVAL_FALLBACK_NOUN;
  }
  if (intervalHours % GEO_SCAN_HOURS_PER_DAY === 0) {
    const days = intervalHours / GEO_SCAN_HOURS_PER_DAY;
    return days === 1 ? "day" : `${days} days`;
  }
  return `${intervalHours} hours`;
}

/** Whole days for a custom interval, rounded up so partial days stay visible. */
export function geoScanIntervalDays(intervalHours: number): number {
  return Math.max(1, Math.ceil(intervalHours / GEO_SCAN_HOURS_PER_DAY));
}

export function isGeoScanIntervalPreset(intervalHours: number): boolean {
  return GEO_SCAN_INTERVAL_OPTIONS.some(
    (entry) => entry.value === intervalHours
  );
}

export function summarizeGeoEngineAttempts(
  tasks: readonly { engine: string }[],
  results: readonly unknown[]
): GeoEngineAttemptSummary[] {
  const byEngine = new Map<string, GeoEngineAttemptSummary>();
  for (const [index, task] of tasks.entries()) {
    const summary = byEngine.get(task.engine) ?? {
      engine: task.engine,
      attempted: 0,
      failed: 0,
    };
    summary.attempted += 1;
    if (results[index] === null) {
      summary.failed += 1;
    }
    byEngine.set(task.engine, summary);
  }
  return [...byEngine.values()];
}

/**
 * Counts prompt checks and sequence turns using the scan planner's limits.
 * ZDR filtering and failed translations can reduce the actual number of checks.
 */
export function calcGeoScanSize(input: GeoScanSizeInput): number {
  if (!Number.isFinite(input.promptCount) || input.promptCount < 0) {
    return 0;
  }
  const engines = [...new Set(input.engines)];
  const groundedCount = engines.filter((engine) =>
    input.catalog.models.some(
      (model) => model.id === engine && model.supportsGroundedChecks
    )
  ).length;
  const scanEnglish = input.languages.includes(DEFAULT_LANGUAGE);
  const extraLanguages = input.languages
    .filter((language) => language !== DEFAULT_LANGUAGE)
    .slice(0, GEO_MAX_LANGUAGES).length;
  const englishChecks = scanEnglish
    ? input.promptCount * engines.length +
      Math.min(input.promptCount, GEO_GROUNDED_MAX_PROMPTS) * groundedCount
    : 0;
  const localizedChecks =
    extraLanguages *
    (Math.min(input.promptCount, GEO_LANGUAGE_MAX_PROMPTS) * engines.length +
      Math.min(
        input.promptCount,
        GEO_LANGUAGE_MAX_PROMPTS,
        GEO_LANGUAGE_GROUNDED_MAX_PROMPTS
      ) *
        groundedCount);
  const sequenceEngines =
    groundedCount +
    engines.filter(
      (engine) =>
        engine === GEO_OPENCODE_ENGINE_ID || isGeoBoxCodingAgent(engine)
    ).length;
  const sequenceTurns = scanEnglish
    ? input.sequences
        .filter((sequence) => sequence.enabled)
        .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, GEO_MAX_SEQUENCES)
        .reduce(
          (total, sequence) =>
            total + Math.min(sequence.steps.length, GEO_SEQUENCE_MAX_TURNS),
          0
        )
    : 0;
  return englishChecks + localizedChecks + sequenceTurns * sequenceEngines;
}

export function geoScanSizeSeverity(total: number): GeoScanSizeSeverity {
  if (total >= GEO_SCAN_SIZE_DANGER_THRESHOLD) {
    return "danger";
  }
  if (total >= GEO_SCAN_SIZE_WARN_THRESHOLD) {
    return "warn";
  }
  return "ok";
}
