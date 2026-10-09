import { isDemoMode } from "@notra/utils/demo-mode";
import { os } from "@orpc/server";

import { assertAuthenticated } from "@/lib/auth/organization";
import type { ORPCContext } from "@/types/orpc/context";

// In the public demo every successful mutation also lands in the visitor's
// request feed. Outside the demo this returns right away and the demo logger
// is never loaded.
export const baseProcedure = os
  .$context<ORPCContext>()
  .use(async ({ next, path }, input) => {
    if (!isDemoMode()) {
      return next();
    }
    const startedAt = performance.now();
    // Load the logger while the procedure runs; time only the procedure.
    const logger = import("@/lib/demo/ui-actions");
    const result = await next();
    const durationMs = performance.now() - startedAt;
    const { logDemoUiAction } = await logger;
    logDemoUiAction({ path, input, output: result.output, durationMs });
    return result;
  });

export const authorizedProcedure = baseProcedure.use(
  async ({ context, next }) => {
    const auth = await assertAuthenticated({ headers: context.headers });

    return next({
      context: {
        ...context,
        session: auth.session,
        user: auth.user,
      },
    });
  }
);
