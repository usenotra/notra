export interface BenchmarkConfig {
  label: string;
  cwd: string;
  output: string;
  samples: number;
  timeoutMs: number;
  command?: string[];
  baseUrl?: string;
  warmup?: number;
  routes?: { path: string; statuses: number[] }[];
}

export interface HttpTiming {
  status: number | null;
  headersMs: number | null;
  totalMs: number;
  bytes: number | null;
  error: string | null;
}

export interface TimingSummary {
  count: number;
  minMs: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
}
