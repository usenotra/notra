import type {
  InternalDashboardAdapterError,
  InternalDashboardError,
  InternalDashboardTimeoutError,
} from "@notra/schemas/api/internal-dashboard";
import type { Effect } from "effect";
import type { ZodType } from "zod";

type InternalDashboardFailure =
  | InternalDashboardAdapterError
  | InternalDashboardError
  | InternalDashboardTimeoutError;

export interface InternalDashboardOperations {
  call: <A>(
    url: string,
    payload: unknown,
    schema: ZodType<A>,
    timeoutMs?: number
  ) => Effect.Effect<A, InternalDashboardFailure>;
}

export interface InternalDashboardDependencies {
  request: typeof fetch;
  credentials: Effect.Effect<string | null, InternalDashboardAdapterError>;
}
