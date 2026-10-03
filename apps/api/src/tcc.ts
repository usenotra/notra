if (process.env.NODE_ENV === "production" && process.env.TCC_API_KEY) {
  const { TCCSpanProcessor } = await import("@contextcompany/otel");
  const { NodeSDK } = await import("@opentelemetry/sdk-node");
  const { OpenTelemetry } = await import("@ai-sdk/otel");
  const { registerTelemetry } = await import("ai");

  const tcc = new NodeSDK({
    spanProcessors: [new TCCSpanProcessor()],
  });

  tcc.start();
  registerTelemetry(new OpenTelemetry({ runtimeContext: true }));
}
