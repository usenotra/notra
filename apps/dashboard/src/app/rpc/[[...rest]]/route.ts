import { useLogger as getRequestLogger, withEvlog } from "@notra/ai/evlog";
import { httpErrorKind } from "@notra/ai/utils/http-error-kind";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";

import { trackServerException } from "@/lib/analytics/posthog-server";
import { createORPCContext } from "@/lib/orpc/context";
import { dashboardRouter } from "@/lib/orpc/router";
import { isServerFailureError } from "@/utils/orpc-errors";

const handler = new RPCHandler(dashboardRouter, {
  interceptors: [
    onError((error, options) => {
      console.error("[oRPC]", error);
      if (isServerFailureError(error)) {
        trackServerException({
          error,
          headers: options.context.headers,
          userId: options.context.user?.id,
          organizationId: options.context.session?.activeOrganizationId,
          properties: { surface: "rpc" },
        });
      }
    }),
  ],
  plugins: [new BatchHandlerPlugin()],
});

const handle = withEvlog(async (request: Request) => {
  const startedAt = performance.now();
  const log = getRequestLogger();
  log.set({
    event: "api.request.completed",
    surface: "dashboard-rpc",
    routeId: "/rpc/[[...rest]]",
  });
  try {
    const { matched, response } = await handler.handle(request, {
      context: await createORPCContext({
        headers: request.headers,
      }),
      prefix: "/rpc",
    });

    const result =
      matched && response
        ? response
        : new Response("Not Found", { status: 404 });
    log.set({
      outcome: result.status >= 400 ? "error" : "success",
      errorKind: httpErrorKind(result.status),
    });
    return result;
  } catch (error) {
    log.set({ outcome: "error", errorKind: "server_error" });
    throw error;
  } finally {
    log.set({ durationMs: Math.round(performance.now() - startedAt) });
  }
});

export const HEAD = handle;
// react-doctor-disable-next-line react-doctor/nextjs-no-side-effect-in-get-handler -- log.set only enriches request telemetry; it does not mutate application data.
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
