import { log } from "@notra/ai/evlog";
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
 * Server-side replacement for console.error: one structured evlog event that
 * reaches Axiom and carries the current requestId when there is one. Never
 * import from client code.
 */
export function logError(
  message: string,
  error?: unknown,
  fields?: LogFields
): void {
  log.error({
    ...withContext(message, fields),
    ...(error === undefined ? {} : { error: errorFields(error) }),
  });
}

/** Server-side replacement for console.warn. */
export function logWarn(message: string, fields?: LogFields): void {
  log.warn(withContext(message, fields));
}

/** Server-side replacement for console.log / console.info. */
export function logInfo(message: string, fields?: LogFields): void {
  log.info(withContext(message, fields));
}
