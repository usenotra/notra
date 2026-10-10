export interface AccumulatedUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Cost summed per call, preserving each call's long-context price tier. */
  costMicroUsd?: number;
}
