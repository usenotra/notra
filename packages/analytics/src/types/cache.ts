export type AnalyticsCacheScope = "social" | "geo";

export interface CachedQueryOptions<TResult> {
  scope: AnalyticsCacheScope;
  pipe: string;
  organizationId: string | null;
  params: Record<string, unknown>;
  fetch: () => Promise<TResult>;
}
