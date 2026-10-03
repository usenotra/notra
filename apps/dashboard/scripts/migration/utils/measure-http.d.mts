import type { HttpTiming } from "../types/benchmark";

export function measureHttp(
  url: string,
  timeoutMs: number
): Promise<HttpTiming>;
