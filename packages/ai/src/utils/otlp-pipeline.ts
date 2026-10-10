import { OTLP_AUTH_ERROR_PATTERN } from "@notra/ai/constants/evlog";
import { sendOTLPBatch } from "@notra/ai/utils/send-otlp-batch";
import { createShippingPipeline } from "@notra/ai/utils/shipping-pipeline";
import { telemetryEvent } from "@notra/ai/utils/telemetry-event";

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
  return createShippingPipeline(
    (batch) =>
      sendOTLPBatch(
        batch.map(({ event }) => telemetryEvent(event)),
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
        "[otlp] authentication rejected; export disabled until reinitialization or next deploy",
    }
  );
}
