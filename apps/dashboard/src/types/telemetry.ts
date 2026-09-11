export interface TelemetryRequestContext {
  get(): { waitUntil?: (promise: Promise<void>) => void } | undefined;
}

export type TelemetryHost = typeof globalThis & {
  [key: symbol]: TelemetryRequestContext | undefined;
};
