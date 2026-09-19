import { useLogger as getRequestLogger, withEvlog } from "@notra/ai/evlog";
import { httpErrorKind } from "@notra/ai/utils/http-error-kind";
import { runWithGeoRequestMemo } from "@notra/geo-core/utils/request-memo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import { after } from "next/server";

import { DASHBOARD_RPC_SLOW_REQUEST_MS } from "@/constants/request-telemetry";
import {
  trackServerEvent,
  trackServerException,
} from "@/lib/analytics/posthog-server";
import { createORPCContext, type ORPCRequestMemo } from "@/lib/orpc/context";
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
  const path = new URL(request.url).pathname;
  const requestId = log.getContext().requestId;
  let procedure: string | undefined;
  let requestMemo: ORPCRequestMemo | undefined;
  let status = 500;
  log.set({
    event: "api.request.completed",
    surface: "dashboard-rpc",
    routeId: "/rpc/[[...rest]]",
  });
  try {
    const context = await createORPCContext({ headers: request.headers });
    requestMemo = context.requestMemo;
    const { matched, response } = await runWithGeoRequestMemo(() =>
      handler.handle(request, { context, prefix: "/rpc" })
    );

    const result =
      matched && response
        ? response
        : new Response("Not Found", { status: 404 });
    procedure = matched ? path.slice("/rpc/".length) : undefined;
    status = result.status;
    log.set({
      outcome: status >= 400 ? "error" : "success",
      errorKind: httpErrorKind(status),
    });
    return result;
  } catch (error) {
    log.set({ outcome: "error", errorKind: "server_error" });
    throw error;
  } finally {
    const durationMs = Math.round(performance.now() - startedAt);
    log.set({ durationMs });
    if (durationMs >= DASHBOARD_RPC_SLOW_REQUEST_MS || status >= 400) {
      after(async () => {
        try {
          const auth = await requestMemo?.sessionLookup?.catch(() => undefined);
          trackServerEvent({
            event: POSTHOG_EVENTS.API_REQUEST,
            headers: request.headers,
            organizationId: auth?.session?.activeOrganizationId,
            properties: {
              capture_reason: status >= 400 ? "error" : "slow",
              latency_ms: durationMs,
              method: request.method,
              procedure,
              request_id: typeof requestId === "string" ? requestId : undefined,
              route_id: "/rpc/[[...rest]]",
              status,
              surface: "dashboard-rpc",
            },
            userId: auth?.user?.id,
          });
        } catch (error) {
          console.error("[posthog] dashboard RPC capture failed", error);
        }
      });
    }
  }
});

export const HEAD = handle;
// react-doctor-disable-next-line react-doctor/nextjs-no-side-effect-in-get-handler -- log.set only enriches request telemetry; it does not mutate application data.
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
