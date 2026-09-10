import { runWithOperationalContext } from "@notra/ai/utils/operational-context";
import type { Context, Next } from "hono";

import { logApiRequest } from "../utils/analytics";

export async function apiObservabilityMiddleware(
  c: Context,
  next: Next
): Promise<void> {
  const startedAt = performance.now();
  const requestId = crypto.randomUUID();
  c.header("X-Request-Id", requestId);
  await runWithOperationalContext({ requestId }, async () => {
    try {
      await next();
    } finally {
      // Hono handles downstream errors before next() resolves. Reapply the ID
      // because an error handler can replace the response and its headers.
      c.header("X-Request-Id", requestId);
      logApiRequest(c, Math.round(performance.now() - startedAt));
    }
  });
}
