import { os } from "@orpc/server";

import { assertAuthenticated } from "@/lib/auth/organization";
import { logDemoUiAction } from "@/lib/demo/ui-actions";

import type { ORPCContext } from "./context";

// In the public demo every successful mutation also lands in the visitor's
// request feed; outside the demo this is a no-op.
export const baseProcedure = os
  .$context<ORPCContext>()
  .use(async ({ next, path }, input) => {
    const startedAt = performance.now();
    const result = await next();
    logDemoUiAction({
      path,
      input,
      output: result.output,
      durationMs: performance.now() - startedAt,
    });
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
