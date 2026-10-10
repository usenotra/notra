import { LOG_TRANSPORT_TIMEOUT_MS } from "@notra/ai/constants/evlog";
import type { OtlpBatchConfig } from "@notra/ai/types/log-shipping";
import { isRecord } from "@notra/ai/utils/unknown-record";
import type { WideEvent } from "evlog";
import { toOTLPLogRecord } from "evlog/otlp";

/** Keep evlog's record encoding, but inspect partial success without replaying accepted logs. */
export async function sendOTLPBatch(
  events: WideEvent[],
  config: OtlpBatchConfig
): Promise<void> {
  if (events.length === 0) {
    return;
  }
  const groups = new Map<string, [WideEvent, ...WideEvent[]]>();
  for (const event of events) {
    const key = `${event.service}::${event.environment}`;
    const group = groups.get(key);
    if (group) {
      group.push(event);
    } else {
      groups.set(key, [event]);
    }
  }
  const resourceLogs = Array.from(groups.values()).map((group) => {
    const event = group[0];
    const attributes = {
      "service.name": config.serviceName ?? event.service,
      "deployment.environment": event.environment,
      "service.version": event.version,
      "cloud.region": event.region,
      "deployment.environment.name": config.environmentName,
    };
    return {
      resource: {
        attributes: Object.entries(attributes).flatMap(([key, value]) =>
          value === undefined ? [] : [{ key, value: { stringValue: value } }]
        ),
      },
      scopeLogs: [
        {
          scope: { name: "evlog" },
          logRecords: group.map((item) => toOTLPLogRecord(item)),
        },
      ],
    };
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOG_TRANSPORT_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${config.endpoint.replace(/\/$/, "")}/v1/logs`,
      {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          "X-Evlog-Source": "otlp",
          ...config.headers,
        },
        body: JSON.stringify({ resourceLogs }),
        signal: controller.signal,
      }
    );
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      // Never attach response text to errors; the shipping shell classifies status only.
      throw new Error(`OTLP API error: ${response.status}`);
    }
    // A 2xx batch is already accepted: malformed or interrupted response bodies
    // must not trigger retries that replay the accepted subset.
    const body: unknown = await response.json().catch(() => undefined);
    if (isRecord(body) && isRecord(body.partialSuccess)) {
      const raw = body.partialSuccess.rejectedLogRecords;
      const rejected =
        typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw;
      if (
        typeof rejected === "number" &&
        Number.isSafeInteger(rejected) &&
        rejected > 0
      ) {
        try {
          console.warn(`[otlp] ${rejected} event(s) rejected by collector`);
        } catch {
          // A diagnostic failure must not replay an already accepted batch.
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }
}
