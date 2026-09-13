import type { GeoScopeInput } from "@notra/geo-core/types/geo";
import type { QueryClient } from "@tanstack/react-query";

export interface GeoCollectionSpec<T extends object> {
  name: string;
  errorMessage: string;
  /** When set, defers load-error toasts to the global QueryCache retry UI. */
  showRetryAction?: boolean;
  /** Bounded retries for transient load failures (React Query observer option). */
  retry?: number;
  fetch: (scope: GeoScopeInput) => Promise<T[]>;
  getKey: (item: T) => string;
  insert?: (scope: GeoScopeInput, item: T) => Promise<unknown>;
  update?: (
    scope: GeoScopeInput,
    key: string,
    modified: T,
    original: T
  ) => Promise<unknown>;
  remove?: (scope: GeoScopeInput, original: T) => Promise<unknown>;
  invalidateLegacy: (
    queryClient: QueryClient,
    scope: GeoScopeInput
  ) => Promise<unknown>;
}
