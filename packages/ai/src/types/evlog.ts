import type { DrainContext } from "evlog";

import type { LogFlushScheduler } from "./operational-log";

export type GeoLogEventName = `geo.${string}`;

export interface GeoLogEvent extends Record<string, unknown> {
  event: GeoLogEventName;
}

export interface GeoLogger {
  info(event: GeoLogEvent): void;
  warn(event: GeoLogEvent): void;
  error(event: GeoLogEvent): void;
}

export type EvlogDrain = (ctx: DrainContext) => void | Promise<void>;

export interface SequencedDrainContext extends DrainContext {
  sequence: number;
}

export interface LogFlushCheckpoint {
  promise: Promise<void>;
  resolve: () => void;
}

export interface LogPipeline {
  (context: DrainContext): void;
  flush(): Promise<void>;
}

export interface EvlogRuntimeState {
  aiDrain?: LogPipeline;
  geoDrain?: LogPipeline;
  flushScheduler?: LogFlushScheduler;
}

export type EvlogGlobal = typeof globalThis & {
  __notraEvlogRuntime?: EvlogRuntimeState;
};
