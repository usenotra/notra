export interface CatalogMetric {
  id: string;
  unit: string;
  aggregations: string[];
  dimensions: string[];
  derivedFrom: { event: string };
}

export interface CatalogPage {
  metrics: CatalogMetric[];
  pagination?: { hasMore: boolean; nextCursor?: string };
}

export interface MetricGroup {
  key: string;
  dimensions: string[];
  metrics: CatalogMetric[];
  breakdown?: string;
}

export interface MetricSelection {
  alias: string;
  metric: CatalogMetric;
  aggregation: string;
}

export interface MetricQueryBody {
  scope: { ownerId: string };
  timeRange: { start: string; end: string };
  bucketSeconds: number;
  groupBy?: string[];
  metrics: Record<string, { metric: string; aggregation: string }>;
  outputs: string[];
  seriesSelection?: {
    limit: number;
    mode: "exact";
    rankBy: { metric: string; direction: "desc" }[];
  };
}

export interface MetricQuery {
  end: number;
  selections: MetricSelection[];
  body: MetricQueryBody;
}

export interface MetricSummary {
  dimensions: Record<string, unknown>;
  values: Record<string, unknown>;
}

export type VercelApi = (
  path: string,
  body?: MetricQueryBody
) => Promise<unknown>;
export type VercelRequest = (
  url: URL,
  options: RequestInit
) => Promise<Response>;
export type QueryResult =
  | { group: string; ok: true; rows: number }
  | { group: string; ok: false; reason: string };
