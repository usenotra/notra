import type { LogFlushScheduler } from "@notra/ai/types/operational-log";
import type { SpanProcessor } from "@opentelemetry/sdk-trace-base";

export interface AgentTracingState {
  processor?: SpanProcessor;
  scheduleFlush?: LogFlushScheduler;
  telemetryRegistered?: boolean;
}

export type AgentTracingHost = typeof globalThis & {
  __notraAgentTracing?: AgentTracingState;
};
