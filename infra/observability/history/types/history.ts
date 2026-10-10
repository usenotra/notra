export interface ScanHistoryRow {
  id: string;
  organization_id: string;
  status: string;
  started_at: Date;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_write_tokens: number | null;
  reasoning_tokens: number | null;
  total_usd: number | null;
  duration_ms: number | null;
}

export interface HistoryPayload {
  streams: {
    stream: Record<string, string>;
    values: [string, string][];
  }[];
}

export interface HistorySnapshot {
  readonly snapshotStart: string;
  readonly snapshotEnd: string;
}

export interface HistoryEvent extends HistorySnapshot {
  timestamp: string;
  [field: string]: unknown;
}
