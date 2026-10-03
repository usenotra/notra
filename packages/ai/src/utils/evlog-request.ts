import { createLoggerStorage, defineFrameworkIntegration } from "evlog/toolkit";

const { storage, useLogger } = createLoggerStorage(
  "withEvlog() context. Wrap your handler with withEvlog().",
  "notra:evlog"
);

export { useLogger as useRequestLogger };

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
