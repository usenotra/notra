import { OTLP_AUTH_ERROR_PATTERN } from "@notra/ai/constants/evlog";
import type { CheckpointLogPipeline } from "@notra/ai/types/evlog";
import { sendOTLPBatch } from "@notra/ai/utils/send-otlp-batch";
import { createShippingPipeline } from "@notra/ai/utils/shipping-pipeline";
import { telemetryEvent } from "@notra/ai/utils/telemetry-event";
import type { DrainContext } from "evlog";

export function createOTLPPipeline() {
  const endpoint = process.env.NOTRA_OTLP_ENDPOINT;
  const token = process.env.NOTRA_OTLP_TOKEN;
  if (!endpoint || !token) {
    return undefined;
  }
  try {
    const url = new URL(endpoint);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" && url.hostname.endsWith(".railway.internal")
        ))
    ) {
      throw new Error("invalid endpoint");
    }
  } catch {
    // Optional shipping must not take down app startup or the Axiom drain.
    // Do not include the supplied URL: it may contain credentials.
    console.warn("[otlp] invalid NOTRA_OTLP_ENDPOINT; export disabled");
    return undefined;
  }
  const pipeline = createShippingPipeline(
    (batch) =>
      sendOTLPBatch(
        batch.map(({ event }) => event),
        {
          endpoint,
          headers: { Authorization: `Bearer ${token}` },
          serviceName: process.env.NOTRA_TELEMETRY_SERVICE_NAME,
          environmentName:
            process.env.VERCEL_ENV ??
            process.env.RAILWAY_ENVIRONMENT_NAME ??
            process.env.NODE_ENV ??
            "unknown",
        }
      ),
    {
      label: "otlp",
      permanentErrorPattern: OTLP_AUTH_ERROR_PATTERN,
      disabledMessage:
        "[otlp] authentication or endpoint rejected; export disabled until reinitialization or next deploy",
    }
  );
  const push = (ctx: DrainContext) => {
    pipeline({ event: telemetryEvent(ctx.event) });
  };
  return Object.defineProperty(
    Object.assign(push, { flush: () => pipeline.flush() }),
    "pending",
    { get: () => pipeline.pending, enumerable: true }
  ) as CheckpointLogPipeline;
}
