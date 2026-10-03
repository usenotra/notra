import type { BenchmarkConfig } from "../types/benchmark";

export function localUrl(value: string): URL;
export function loadConfig(
  mode: "build" | "http",
  path: string
): BenchmarkConfig;
