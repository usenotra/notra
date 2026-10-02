import { flushLogs, setLogFlushScheduler } from "@notra/ai/evlog";
import { flushPostHogServer } from "@notra/posthog/server";
import { defineMiddleware } from "nitro";
import { onDispose } from "nitro/h3";

import { IMAGE_SECURITY_HEADERS } from "../../constants/framework-image";
import { onRequestError, register } from "../../instrumentation";
import {
  getDashboardRedirect,
  getDashboardSecurityHeaders,
} from "../../utils/framework-request";
import { afterResponse, dashboardRequestContext } from "./after-response";

export function scheduleDashboardTask(flush: () => unknown) {
  afterResponse(async () => {
    await flush();
  });
}

setLogFlushScheduler(scheduleDashboardTask);

export default defineMiddleware(async (event, next) => {
  onDispose(event, () =>
    Promise.allSettled([flushLogs(), flushPostHogServer()])
  );
  return await dashboardRequestContext.run(event, async () => {
    for (const [key, value] of Object.entries(getDashboardSecurityHeaders())) {
      event.res.headers.set(key, value);
    }
    if (event.url.pathname === "/api/image") {
      event.res.headers.set(
        "Content-Security-Policy",
        IMAGE_SECURITY_HEADERS["Content-Security-Policy"]
      );
    }
    try {
      await register();
      return getDashboardRedirect(event.req) ?? (await next());
    } catch (error) {
      await onRequestError(error, event.req).catch((captureError) => {
        console.error("[telemetry] request error capture failed", captureError);
      });
      throw error;
    }
  });
});
