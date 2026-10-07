let registration: Promise<void> | undefined;

async function initialize() {
  const [
    { setLogFlushScheduler },
    { setAgentTraceFlushScheduler },
    { waitUntil },
    { register },
  ] = await Promise.all([
    import("@notra/ai/evlog"),
    import("@notra/ai/utils/agent-tracing"),
    import("@vercel/functions"),
    import("@/instrumentation"),
  ]);
  setLogFlushScheduler((flush) => {
    waitUntil(Promise.resolve().then(flush));
  });
  setAgentTraceFlushScheduler((flush) => {
    waitUntil(Promise.resolve().then(flush));
  });
  await register();
}

export function registerWorkflowRuntime(): Promise<void> {
  registration ??= initialize().catch(() => {
    registration = undefined;
    console.error("[telemetry] workflow runtime registration failed");
  });
  return registration;
}
