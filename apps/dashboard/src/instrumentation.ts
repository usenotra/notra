import { defineNodeInstrumentation } from "evlog/next/instrumentation";

const evlogInstrumentation = defineNodeInstrumentation(async () => {
  const [evlog, { after }] = await Promise.all([
    import("@notra/ai/evlog"),
    import("next/server"),
  ]);
  evlog.setLogFlushScheduler((flush) => after(flush));
  return evlog;
});

export async function register() {
  await evlogInstrumentation.register();

  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production"
  ) {
    const { registerOTelTCC } = await import("@contextcompany/otel/nextjs");
    registerOTelTCC();
  }
}

export const onRequestError: typeof evlogInstrumentation.onRequestError =
  async (error, request, context) => {
    await evlogInstrumentation.onRequestError(error, request, context);

    if (process.env.NEXT_RUNTIME !== "nodejs") {
      return;
    }

    const [
      { captureServerException, flushPostHogServer },
      { getPostHogRequestContext },
      { scheduleRequestErrorTelemetry },
    ] = await Promise.all([
      import("@notra/posthog/server"),
      import("@notra/posthog/request"),
      import("@/utils/request-error-telemetry"),
    ]);

    const requestContext = getPostHogRequestContext({
      get: (name) => request.headers[name] ?? null,
    });

    captureServerException({
      error,
      distinctId: requestContext.distinctId,
      sessionId: requestContext.sessionId,
      properties: {
        path: request.path,
        method: request.method,
        router_kind: context.routerKind,
        route_path: context.routePath,
        route_type: context.routeType,
      },
    });
    const { flushLogs } = await import("@notra/ai/evlog");
    scheduleRequestErrorTelemetry(() =>
      Promise.allSettled([flushPostHogServer(), flushLogs()])
    );
  };
