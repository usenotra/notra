import { useLogger as getRequestLogger, withEvlog } from "@notra/ai/evlog";
import { createMiddleware } from "@tanstack/react-start";

type RequestLogger = ReturnType<
  typeof getRequestLogger<Record<string, unknown>>
>;

/**
 * One wide event per server route request. Handlers read the logger from
 * `context.log` to attach their own fields; anything deeper in the call stack
 * can still reach it through `useLogger()`.
 */
export const requestLogMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const run = (log: RequestLogger) => next({ context: { log } });
    let result: Awaited<ReturnType<typeof run>> | undefined;
    // withEvlog emits the event once the response (or its stream) completes,
    // so the response it hands back replaces the one the route produced.
    const response = await withEvlog(async (_request: Request) => {
      result = await run(getRequestLogger());
      return result.response;
    })(request);
    // No result means withEvlog answered a thrown EvlogError itself.
    if (!result) {
      return response;
    }
    return { ...result, response };
  }
);
