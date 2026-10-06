import { OpenTelemetry } from "@ai-sdk/otel";
import {
  AGENT_TRACE_RESOURCE_ATTRIBUTES,
  DEFAULT_AGENT_TRACE_ENDPOINT,
} from "@notra/ai/constants/agent-tracing";
import type { AgentTracingHost } from "@notra/ai/types/agent-tracing";
import type { LogFlushScheduler } from "@notra/ai/types/operational-log";
import { buildAgentTraceAttributes } from "@notra/ai/utils/agent-trace-attributes";
import { createLogFlushScheduler } from "@notra/ai/utils/log-flush-scheduler";
import { TraceFlags } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchSpanProcessor,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { registerTelemetry } from "ai";

const host = globalThis as AgentTracingHost;
host.__notraAgentTracing ??= {};
const state = host.__notraAgentTracing;

export function registerAgentTelemetry(): void {
  if (state.telemetryRegistered) {
    return;
  }
  registerTelemetry(new OpenTelemetry({ runtimeContext: true, usage: true }));
  state.telemetryRegistered = true;
}

export function setAgentTraceFlushScheduler(schedule: LogFlushScheduler): void {
  state.scheduleFlush = createLogFlushScheduler(schedule);
}

export function createAgentTraceProcessor(): SpanProcessor | undefined {
  if (
    process.env.RESPAN_TRACING_ENABLED !== "true" ||
    !process.env.RESPAN_API_KEY
  ) {
    return undefined;
  }
  if (state.processor) {
    return state.processor;
  }

  const recordContent = process.env.RESPAN_RECORD_CONTENT === "true";
  const endpoint = new URL(
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
      DEFAULT_AGENT_TRACE_ENDPOINT
  );
  if (
    endpoint.username ||
    endpoint.password ||
    (endpoint.protocol !== "https:" &&
      !(
        endpoint.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)
      ))
  ) {
    throw new Error("Agent trace endpoint requires HTTPS or loopback HTTP");
  }
  const exporter = new OTLPTraceExporter({
    url: endpoint.href,
    headers: { Authorization: `Bearer ${process.env.RESPAN_API_KEY}` },
    timeoutMillis: 5000,
  });
  const batch = new BatchSpanProcessor(exporter, { exportTimeoutMillis: 5000 });
  const resource = resourceFromAttributes(AGENT_TRACE_RESOURCE_ATTRIBUTES);
  const includedParents = new Map<string, boolean>();

  state.processor = {
    onStart(span) {
      try {
        const context = span.spanContext();
        if (
          span.instrumentationScope.name !== "gen_ai" ||
          (context.traceFlags & TraceFlags.SAMPLED) === 0
        ) {
          return;
        }
        const parent = span.parentSpanContext;
        includedParents.set(
          `${context.traceId}:${context.spanId}`,
          parent !== undefined &&
            includedParents.has(`${parent.traceId}:${parent.spanId}`)
        );
      } catch {
        console.warn("[telemetry] agent trace processing failed");
      }
    },
    onEnd(span) {
      let spanKey: string | undefined;
      try {
        if (span.instrumentationScope.name !== "gen_ai") {
          return;
        }
        const spanContext = { ...span.spanContext(), traceState: undefined };
        spanKey = `${spanContext.traceId}:${spanContext.spanId}`;
        batch.onEnd({
          name: span.name,
          kind: span.kind,
          spanContext: () => spanContext,
          parentSpanContext:
            includedParents.get(spanKey) && span.parentSpanContext
              ? { ...span.parentSpanContext, traceState: undefined }
              : undefined,
          startTime: span.startTime,
          endTime: span.endTime,
          duration: span.duration,
          ended: span.ended,
          resource,
          instrumentationScope: {
            name: span.instrumentationScope.name,
            version: span.instrumentationScope.version,
          },
          droppedAttributesCount: span.droppedAttributesCount,
          droppedEventsCount: span.droppedEventsCount,
          droppedLinksCount: span.droppedLinksCount,
          attributes: buildAgentTraceAttributes(
            span.attributes,
            recordContent,
            span.kind
          ),
          status: { code: span.status.code },
          events: span.events
            .filter((event) => event.name === "exception")
            .map((event) => ({
              ...event,
              attributes:
                typeof event.attributes?.["exception.type"] === "string"
                  ? {
                      "exception.type": event.attributes["exception.type"],
                    }
                  : {},
            })),
          links: span.links.map((link) => ({
            ...link,
            context: { ...link.context, traceState: undefined },
            attributes: {},
          })),
        });
        state.scheduleFlush?.(flushAgentTraces);
      } catch {
        console.warn("[telemetry] agent trace processing failed");
        return;
      } finally {
        if (spanKey) {
          includedParents.delete(spanKey);
        }
      }
    },
    async forceFlush() {
      try {
        await batch.forceFlush();
      } finally {
        await exporter.forceFlush();
      }
    },
    shutdown: () => batch.shutdown(),
  };
  return state.processor;
}

export async function flushAgentTraces(): Promise<void> {
  await state.processor?.forceFlush().catch(() => {
    console.warn("[telemetry] agent trace export failed");
  });
}

export async function shutdownAgentTraces(): Promise<void> {
  const processor = state.processor;
  state.processor = undefined;
  await processor?.shutdown().catch(() => {});
}
