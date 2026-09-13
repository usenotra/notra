import type {
  GeoEntitlementService,
  GeoFeatureFlagService,
  GeoGenerationService,
  GeoWorkflowService,
  AgentReadinessNetwork,
  GeoModelService,
  GeoSearchConsoleService,
} from "@notra/geo-core/deps";
import type { GeoRouterError } from "@notra/geo-core/geo/errors";
import type { ZodType } from "zod";

import type {
  AgentReadinessApiError,
  AgentReadinessClaimError,
  AgentReadinessStampError,
  AgentReadinessStartError,
  AgentReadinessTargetMissingError,
} from "@notra/geo-core/schemas/agent-readiness-errors";

import type {
  GeoScanNotFoundError,
  GeoSelectionInvalidError,
} from "../errors/geo";

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

type AgentReadinessProgramError =
  | AgentReadinessApiError
  | AgentReadinessClaimError
  | AgentReadinessStampError
  | AgentReadinessStartError
  | AgentReadinessTargetMissingError;

/** Domain failures from geo-core plus API-boundary validation errors. */
export type GeoProgramError =
  | GeoRouterError
  | GeoSelectionInvalidError
  | AgentReadinessProgramError
  | GeoScanNotFoundError;

export interface RemoteGeoEffectOptions<A> {
  readonly responseSchema: ZodType<A>;
  readonly timeoutMs: number;
  readonly timeoutMessage: string;
}
