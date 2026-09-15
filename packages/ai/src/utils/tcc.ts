import type { TccMetadata, TccMetadataValue } from "@notra/ai/types/tcc";

export type { TccMetadata } from "@notra/ai/types/tcc";

// AI SDK 7 dropped `telemetry.metadata`: TCC reads `tcc.*` and custom keys
// from runtime context, which telemetry only emits for opted-in keys.
export function buildTelemetryOptions(metadata?: TccMetadata) {
  const entries = Object.entries(metadata ?? {}).filter(
    ([, value]) => value !== null && value !== undefined
  ) as [string, TccMetadataValue][];

  return {
    runtimeContext: Object.fromEntries(entries),
    telemetry: {
      includeRuntimeContext: Object.fromEntries(
        entries.map(([key]) => [key, true] as const)
      ),
    },
  };
}
