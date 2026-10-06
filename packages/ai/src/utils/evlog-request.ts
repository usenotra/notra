import { createLoggerStorage, defineFrameworkIntegration } from "evlog/toolkit";

const { storage, useLogger } = createLoggerStorage(
  "withEvlog() context. Wrap your handler with withEvlog().",
  "notra:evlog"
);

export { useLogger as useRequestLogger };

type RequestLogger = ReturnType<typeof useLogger<Record<string, unknown>>>;

// evlog seals a request logger once its wide event is emitted and drops
// anything set afterwards. Streamed responses and after-response work outlive
// that moment, so track it to know when a late log needs its own event.
const emittedLoggers = new WeakSet<RequestLogger>();

export function trackRequestLoggerEmit(logger: RequestLogger): void {
  const emit = logger.emit.bind(logger);
  logger.emit = (overrides) => {
    emittedLoggers.add(logger);
    return emit(overrides);
  };
}

/** The current request's logger, while its wide event is still open. */
export function getOpenRequestLogger(): RequestLogger | undefined {
  const logger = storage.getStore();
  return logger && !emittedLoggers.has(logger) ? logger : undefined;
}

export const evlogRequestIntegration = defineFrameworkIntegration<
  Request | undefined
>({
  name: "notra",
  extractRequest: (request) => ({
    method: request?.method ?? "UNKNOWN",
    path: request ? new URL(request.url).pathname : "/",
    headers: request?.headers,
    requestId: request?.headers.get("x-request-id") ?? undefined,
  }),
  attachLogger: () => {},
  storage,
});
