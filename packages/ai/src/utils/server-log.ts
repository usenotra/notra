import { log } from "@notra/ai/evlog";
import { getOpenRequestLogger } from "@notra/ai/utils/evlog-request";
import { getOperationalContext } from "@notra/ai/utils/operational-context";

type LogFields = Record<string, unknown>;

function errorFields(error: unknown): LogFields {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error.cause === undefined ? {} : { cause: String(error.cause) }),
  };
}

function withContext(message: string, fields: LogFields | undefined) {
  return { ...getOperationalContext(), message, ...fields };
}

/**
 * The open request logger, when these fields can join its wide event without
 * overwriting anything already on it (status, path, an earlier error, …).
 * Otherwise the caller emits a standalone event that carries the requestId.
 */
function requestLoggerFor(fields: LogFields | undefined, key?: string) {
  const logger = getOpenRequestLogger();
  if (!logger) {
    return;
  }
  const context = logger.getContext();
  const keys = [...Object.keys(fields ?? {}), ...(key ? [key] : [])];
  return keys.some((name) => name in context) ? undefined : logger;
}

/**
 * Server-side replacement for console.error. Inside a request the error lands
 * on the request's wide event; elsewhere it is one standalone evlog event.
 * Never import from client code.
 */
export function logError(
  message: string,
  error?: unknown,
  fields?: LogFields
): void {
  const requestLogger = requestLoggerFor(fields, "error");
  if (requestLogger) {
    const cause =
      error instanceof Error
        ? error
        : new Error(error === undefined ? message : String(error));
    requestLogger.error(cause, fields);
    // Keep the caller's description next to the error it explains.
    requestLogger.set({ error: { summary: message } });
    return;
  }
  log.error({
    ...withContext(message, fields),
    ...(error === undefined ? {} : { error: errorFields(error) }),
  });
}

/** Server-side replacement for console.warn. */
export function logWarn(message: string, fields?: LogFields): void {
  const requestLogger = requestLoggerFor(fields);
  if (requestLogger) {
    requestLogger.warn(message, fields);
    return;
  }
  log.warn(withContext(message, fields));
}

/** Server-side replacement for console.log / console.info. */
export function logInfo(message: string, fields?: LogFields): void {
  const requestLogger = requestLoggerFor(fields);
  if (requestLogger) {
    requestLogger.info(message, fields);
    return;
  }
  log.info(withContext(message, fields));
}
