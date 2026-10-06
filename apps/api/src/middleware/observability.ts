import { useLogger as getRequestLogger, withEvlog } from "@notra/ai/evlog";
import { runWithOperationalContext } from "@notra/ai/utils/operational-context";
import type { Context, Next } from "hono";

import { apiRequestLogFields } from "../utils/analytics";

export async function apiObservabilityMiddleware(
  c: Context,
  next: Next
): Promise<void> {
  const startedAt = performance.now();
  const requestId = crypto.randomUUID();
  c.header("X-Request-Id", requestId);
  await runWithOperationalContext({ requestId }, async () => {
    // One wide event per request. Handlers add to it through c.get("log");
    // evlog buffers it and ships it to Axiom after the response.
    const response = await withEvlog(async (_request: Request) => {
      const log = getRequestLogger();
      c.set("log", log);
      try {
        await next();
      } finally {
        // Hono handles downstream errors before next() resolves. Reapply the
        // ID because an error handler can replace the response and its headers.
        c.header("X-Request-Id", requestId);
        const fields = apiRequestLogFields(
          c,
          Math.round(performance.now() - startedAt)
        );
        log.set(fields);
        // Keep the levels the standalone request log had: 4xx warn, 5xx error.
        // A 4xx never downgrades an event a handler already logged an error on.
        if (fields.errorKind === "client_error") {
          if (!("error" in log.getContext())) {
            log.setLevel("warn");
          }
        } else if (fields.outcome === "error") {
          log.setLevel("error");
        }
      }
      return c.res;
    })(c.req.raw);
    // A streamed body comes back wrapped so the event waits for it to finish.
    if (response !== c.res) {
      c.res = response;
    }
  });
}
