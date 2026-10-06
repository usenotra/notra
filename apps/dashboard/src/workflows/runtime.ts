import { setLogFlushScheduler } from "@notra/ai/evlog";
import { waitUntil } from "@vercel/functions";

import { register } from "@/instrumentation";

/**
 * On Vercel the workflow builder emits the step routes as their own functions,
 * outside the Nitro server, so the request middleware that registers logging
 * and tracing (src/lib/framework/runtime.ts) never runs for them. Every steps
 * module imports this file for its side effects. Inside the Nitro server both
 * paths share the same singletons, so this repeats nothing.
 */
setLogFlushScheduler((flush) => {
  waitUntil(Promise.resolve().then(flush));
});
register().catch((error: unknown) => {
  console.error("[telemetry] workflow runtime registration failed", error);
});
