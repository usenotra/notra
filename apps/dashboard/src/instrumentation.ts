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

  if (process.env.NODE_ENV === "production" && process.env.TCC_API_KEY) {
    const [
      { TCCSpanProcessor },
      { registerOTel },
      { OpenTelemetry },
      { registerTelemetry },
    ] = await Promise.all([
      import("@contextcompany/otel"),
      import("@vercel/otel"),
      import("@ai-sdk/otel"),
      import("ai"),
    ]);
    registerOTel({ spanProcessors: [new TCCSpanProcessor()] });
    registerTelemetry(new OpenTelemetry({ runtimeContext: true }));
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
