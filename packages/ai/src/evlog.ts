import type { EvlogDrain, GeoLogEvent, GeoLogger } from "@notra/ai/types/evlog";
import type { LogFlushScheduler } from "@notra/ai/types/operational-log";
import { isGeoLogEvent } from "@notra/ai/utils/evlog";
import { getEvlogRuntime } from "@notra/ai/utils/evlog-runtime";
import { createLogFlushScheduler } from "@notra/ai/utils/log-flush-scheduler";
import {
  getOperationalContext,
  runWithOperationalContext,
} from "@notra/ai/utils/operational-context";
import type { DrainContext } from "evlog";
import { createEvlog } from "evlog/next";
import { createInstrumentation } from "evlog/next/instrumentation";

const service = process.env.NODE_ENV === "development" ? "notra-dev" : "notra";

const runtime = getEvlogRuntime();

export function setLogFlushScheduler(scheduler: LogFlushScheduler): void {
  runtime.flushScheduler = createLogFlushScheduler(scheduler);
}

export async function flushLogs(): Promise<void> {
  await Promise.all([runtime.aiDrain?.flush(), runtime.geoDrain?.flush()]);
}

function routeDrain(ctx: DrainContext) {
  if (isGeoLogEvent(ctx.event)) {
    runtime.geoDrain?.(ctx);
  } else {
    runtime.aiDrain?.(ctx);
  }
  try {
    runtime.flushScheduler?.(flushLogs);
  } catch {
    // Next's after() is unavailable outside a request. Long-lived runtimes
    // use the batch timer and explicitly flush during graceful shutdown.
  }
}

const drain: EvlogDrain | undefined =
  runtime.aiDrain || runtime.geoDrain ? routeDrain : undefined;

const config = {
  service,
  drain,
};

const evlog = createEvlog(config);
export const { useLogger, log, createError } = evlog;

export function withEvlog<TArgs extends unknown[], TReturn>(
  handler: (...args: TArgs) => TReturn
) {
  return evlog.withEvlog((...args: TArgs) => {
    const parent = getOperationalContext();
    const loggerRequestId = useLogger().getContext().requestId;
    const requestId =
      parent?.requestId ??
      (typeof loggerRequestId === "string"
        ? loggerRequestId
        : crypto.randomUUID());
    useLogger().set({ requestId });
    return runWithOperationalContext({ ...parent, requestId }, () =>
      handler(...args)
    );
  });
}

export const { register, onRequestError } = createInstrumentation(config);

export const geoLogDrainEnabled = runtime.geoDrain !== undefined;

register();

export const geoLog: GeoLogger = {
  info: (event: GeoLogEvent) => log.info(event),
  warn: (event: GeoLogEvent) => log.warn(event),
  error: (event: GeoLogEvent) => log.error(event),
};

export async function flushGeoLog(): Promise<void> {
  // GEO jobs can also call AI and website-data integrations.
  await flushLogs();
}
