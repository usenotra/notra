import type {
  GeoEntitlementService,
  GeoFeatureFlagService,
  GeoGenerationService,
  GeoWorkflowService,
  AgentReadinessNetwork,
  GeoModelService,
  GeoSearchConsoleService,
} from "@notra/geo-core/deps";
import type { ZodType } from "zod";

type GeoErrorStatus = 400 | 402 | 404 | 409 | 500 | 503;

export interface GeoFailure {
  readonly status: GeoErrorStatus;
  readonly error: string;
}

export type GeoOutcome<A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly failure: GeoFailure };

export type GeoApiRuntime =
  | AgentReadinessNetwork
  | GeoModelService
  | GeoSearchConsoleService
  | GeoEntitlementService
  | GeoFeatureFlagService
  | GeoGenerationService
  | GeoWorkflowService;

export interface RemoteGeoEffectOptions<A> {
  readonly responseSchema: ZodType<A>;
  readonly timeoutMs: number;
  readonly timeoutMessage: string;
}
