import {
  createAgentTraceProcessor,
  registerAgentTelemetry,
} from "@notra/ai/utils/agent-tracing";

try {
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
    const { NodeSDK } = await import("@opentelemetry/sdk-node");

    const sdk = new NodeSDK({ spanProcessors });

    sdk.start();
    registerAgentTelemetry();
  }
} catch {
  console.error("[telemetry] agent tracing initialization failed");
}
