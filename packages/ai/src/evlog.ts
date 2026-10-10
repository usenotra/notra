import type { EvlogDrain, GeoLogEvent, GeoLogger } from "@notra/ai/types/evlog";
import type { LogFlushScheduler } from "@notra/ai/types/operational-log";
import { isGeoLogEvent } from "@notra/ai/utils/evlog";
import {
  evlogRequestIntegration,
  getOpenRequestLogger,
  trackRequestLoggerEmit,
  useRequestLogger,
} from "@notra/ai/utils/evlog-request";
import { getEvlogRuntime } from "@notra/ai/utils/evlog-runtime";
import { createLogFlushScheduler } from "@notra/ai/utils/log-flush-scheduler";
import {
  getOperationalContext,
  runWithOperationalContext,
} from "@notra/ai/utils/operational-context";
import {
  type DrainContext,
  EvlogError,
  initLogger,
  log,
  createError,
} from "evlog";

const service = process.env.NODE_ENV === "development" ? "notra-dev" : "notra";

const runtime = getEvlogRuntime();

export function setLogFlushScheduler(scheduler: LogFlushScheduler): void {
  runtime.flushScheduler = createLogFlushScheduler(scheduler);
}

export async function flushLogs(): Promise<void> {
  await Promise.all(runtime.pendingAIUsage ?? []);
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
    return;
  }
}

const drain: EvlogDrain | undefined =
  runtime.aiDrain || runtime.geoDrain ? routeDrain : undefined;

export { log, createError, useRequestLogger as useLogger };

let registered = false;

export function register(): void {
  if (registered) {
    return;
  }
  initLogger({ env: { service }, drain });
  registered = true;
}

export function withEvlog<TArgs extends unknown[], TReturn>(
  handler: (...args: TArgs) => TReturn
): (...args: TArgs) => Promise<Awaited<TReturn>>;
export function withEvlog<TArgs extends unknown[], TReturn>(
  handler: (...args: TArgs) => TReturn
) {
  return async (...args: TArgs) => {
    // An outer wrapper (the dashboard's route middleware) already owns this
    // request's event, so a nested handler adds to it instead of emitting twice.
    if (getOpenRequestLogger()) {
      return await handler(...args);
    }
    const parent = getOperationalContext();
    const request = args[0] instanceof Request ? args[0] : undefined;
    const { logger, finish, finishResponse, runWith } =
      evlogRequestIntegration.start(request, { drain });
    trackRequestLoggerEmit(logger);
    const loggerRequestId = logger.getContext().requestId;
    const requestId =
      parent?.requestId ??
      (typeof loggerRequestId === "string"
        ? loggerRequestId
        : crypto.randomUUID());
    logger.set({ requestId });
    const startHeader = request?.headers.get("x-evlog-start");
    if (startHeader) {
      logger.set({ middlewareStart: Number(startHeader) });
    }
    return runWith(() =>
      runWithOperationalContext({ ...parent, requestId }, async () => {
        try {
          const result = await handler(...args);
          if (result instanceof Response) {
            return await finishResponse(result, { status: result.status });
          }
          await finish({ status: 200 });
          return result;
        } catch (error) {
          await finish({
            error: error instanceof Error ? error : new Error(String(error)),
          });
          if (request && EvlogError.isEvlogError(error)) {
            return Response.json(error.toJSON(), { status: error.status });
          }
          throw error;
        }
      })
    );
  };
}

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
