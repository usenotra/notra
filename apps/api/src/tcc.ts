if (process.env.NODE_ENV === "production") {
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
