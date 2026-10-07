import { isDemoMode } from "@notra/utils/demo-mode";

let registration: Promise<void> | undefined;

async function initialize() {
  const { register: registerLogs } = await import("@notra/ai/evlog");
  await registerLogs();

  if (isDemoMode()) {
    const [{ registerGeoDemoTraffic }, { registerDemoSocialAnalytics }] =
      await Promise.all([
        import("@notra/geo-core/geo/demo-traffic"),
        import("@notra/ai/utils/demo-social"),
      ]);
    registerGeoDemoTraffic();
    registerDemoSocialAnalytics();
  }

  try {
    const { createAgentTraceProcessor, registerAgentTelemetry } =
      await import("@notra/ai/utils/agent-tracing");
    const spanProcessors = [];
    try {
      const processor = createAgentTraceProcessor();
      if (processor) {
        spanProcessors.push(processor);
      }
    } catch {
      console.error(
        "[telemetry] optional agent trace exporter initialization failed"
      );
    }
    if (process.env.NODE_ENV === "production" && process.env.TCC_API_KEY) {
      const { TCCSpanProcessor } = await import("@contextcompany/otel");
      spanProcessors.push(new TCCSpanProcessor());
    }
    if (spanProcessors.length > 0) {
      const { registerOTel } = await import("@vercel/otel");
      registerOTel({ spanProcessors });
      registerAgentTelemetry();
    }
  } catch {
    console.error("[telemetry] agent tracing initialization failed");
  }
}

export function register() {
  registration ??= initialize().catch((error) => {
    registration = undefined;
    throw error;
  });
  return registration;
}

export async function onRequestError(error: unknown, request: Request) {
  const [{ log }, { captureServerException }, { getPostHogRequestContext }] =
    await Promise.all([
      import("@notra/ai/evlog"),
      import("@notra/posthog/server"),
      import("@notra/posthog/request"),
    ]);
  const requestContext = getPostHogRequestContext(request.headers);
  const path = new URL(request.url).pathname;
  log.error({
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    path,
    method: request.method,
  });
  captureServerException({
    error,
    distinctId: requestContext.distinctId,
    sessionId: requestContext.sessionId,
    properties: {
      path,
      method: request.method,
      router_kind: "TanStack Start",
    },
  });
}
