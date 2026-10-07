import type {
  LanguageModelV4,
  SharedV4ProviderMetadata,
  SharedV4ProviderOptions,
} from "@ai-sdk/provider";
import type { routerProviderOptionsSchema } from "@notra/ai/schemas/router";
import type { OperationalContext } from "@notra/ai/types/operational-log";
import type { ProviderMetadata } from "ai";
import type * as z from "zod";

export type GatewayId = "vercel" | "openrouter";

export type Plan = "free" | "paid";

export type PlanSource = "resolver" | "cache" | "override" | "default";

export type RouteReason =
  | "pinned"
  | "no-org-default"
  | "paid"
  | "free"
  | "fallback";

export type FallbackReason =
  | "not-configured"
  | "unsupported-model"
  | "no-credits"
  | "auth-failure"
  | "upstream-error"
  | "non-compliant";

export type RouterErrorCode =
  | "no_compliant_route"
  | "gateway_not_configured"
  | "unsupported_model"
  | "credit_balance"
  | "gateway_unavailable";

/**
 * How strictly zero data retention is required for a request.
 * - `required` (default): fail closed, never send a non-ZDR request.
 * - `preferred`: try with ZDR; when no gateway has a ZDR host for the model,
 *   relax ZDR and no-training defaults.
 * - `none`: relax ZDR and no-training defaults immediately.
 */
export type ZdrMode = "required" | "preferred" | "none";

/**
 * Outcome of a zero-data-retention entitlement lookup. `unknown` means the
 * billing provider could not answer; callers decide how to fail.
 */
export type ZdrEntitlement = "entitled" | "not_entitled" | "unknown";

export interface RouteRequest {
  modelId: string;
  organizationId?: string;
  /** Pin the request to a specific gateway (e.g. provider-defined tools). */
  gateway?: GatewayId;
  zdr?: ZdrMode;
  logContext?: Partial<OperationalContext>;
}

export interface RouteDecision {
  gateway: GatewayId;
  /** Model id as requested by the caller (neutral id). */
  requestedModelId: string;
  /** Model id sent to the chosen gateway. */
  modelId: string;
  organizationId?: string;
  plan?: Plan;
  planSource?: PlanSource;
  reason: RouteReason;
  fallbackFrom?: GatewayId;
  fallbackReason?: FallbackReason;
  /** Mode the request resolved to (explicit override or entitlement lookup). */
  zdr: ZdrMode;
  /** True when the adapter sends the ZDR flag and the route insists on it. */
  zdrEnforced: boolean;
  /**
   * True when the route drops the ZDR flag up front: `none` requests always,
   * `preferred` requests once the gateway is known to lack a ZDR host.
   */
  zdrRelaxed?: boolean;
}

export interface RouteMetadata {
  gateway: GatewayId;
  requestedModel: string;
  model: string;
  reason: RouteReason;
  plan?: Plan;
  generationId?: string;
  upstreamProvider?: string;
  costUsd?: number;
  fallbackFrom?: GatewayId;
  fallbackReason?: FallbackReason;
  /** Whether the call that produced this metadata ran with ZDR enforced. */
  zdrEnforced?: boolean;
}

export interface GatewayBalance {
  /** Remaining balance in USD, or null when the gateway does not expose it. */
  balance: number | null;
}

export interface GatewayHealth {
  ok: boolean;
  reason?: string;
}

/**
 * Adapter for a concrete gateway. Adapters are pure: no env access, no
 * logging. They receive everything through their factory config.
 */
export interface GatewayAdapter {
  readonly id: GatewayId;
  /**
   * True when the adapter is configured to enforce zero-data-retention and
   * no-training on every request. Adapters that cannot guarantee this must
   * return false so the router can fail closed.
   */
  readonly enforcesZdr: boolean;
  supportsModel(modelId: string): boolean;
  mapModelId(modelId: string): string;
  createModel(modelId: string): LanguageModelV4;
  /**
   * Translate neutral provider options into the gateway-specific block. The
   * router removes the other gateway's block before delegating.
   */
  buildProviderOptions(
    input: BuildProviderOptionsInput
  ): SharedV4ProviderOptions;
  checkHealth(): Promise<GatewayHealth>;
  getBalance(): Promise<GatewayBalance>;
  /**
   * `servedModelId` is the model id the provider reported in its response,
   * which differs from the requested one after a gateway-side fallback.
   */
  extractRouteMetadata(
    providerMetadata: SharedV4ProviderMetadata | undefined,
    servedModelId?: string
  ): Partial<
    Pick<
      RouteMetadata,
      "generationId" | "upstreamProvider" | "model" | "costUsd"
    >
  >;
  lookupRouteMetadata?(
    generationId: string
  ): Promise<
    Partial<Pick<RouteMetadata, "upstreamProvider" | "model" | "costUsd">>
  >;
}

export interface BuildProviderOptionsInput {
  organizationId?: string;
  /** Caller provider options, already stripped of the router block. */
  providerOptions: SharedV4ProviderOptions;
  router: RouterProviderOptions;
  /** When true privacy flags may be relaxed by the caller (dev only). */
  allowNonZdr: boolean;
  /**
   * Relax privacy defaults for `zdr: "none"` or an accepted best-effort
   * fallback from `zdr: "preferred"`. Explicit no-training options remain.
   */
  relaxZdr?: boolean;
}

/** Neutral provider options translated by the router for each gateway. */
export type RouterProviderOptions = z.infer<typeof routerProviderOptionsSchema>;

export type ReasoningEffort = NonNullable<
  RouterProviderOptions["reasoning"]
>["effort"];

export interface RouterPolicyConfig {
  defaultGateway: GatewayId;
  paidGateway: GatewayId;
  freeGateway: GatewayId;
  allowNonZdr: boolean;
  crossGatewayFallback: boolean;
}

export interface RouterLogFields {
  [key: string]:
    | string
    | string[]
    | number
    | boolean
    | undefined
    | null
    | Record<string, string | number | boolean | undefined | null>;
}

export interface RouterLogger {
  info(event: string, fields?: RouterLogFields): void;
  warn(event: string, fields?: RouterLogFields): void;
  error(event: string, fields?: RouterLogFields): void;
}

export interface TtlCacheStore<T> {
  get(organizationId: string): Promise<T | undefined>;
  set(organizationId: string, value: T, ttlMs: number): Promise<void>;
}

export type PlanCacheStore = TtlCacheStore<Plan>;

export type ZdrCacheStore = TtlCacheStore<ZdrMode>;

export interface CreditTracker {
  record(gateway: GatewayId, balance: number | null): void;
  markExhausted(gateway: GatewayId): void;
  /**
   * Mark a gateway unavailable for a while. With `modelId` the mark only
   * covers that model (a missing ZDR host is a per-model fact); without it
   * the whole gateway is affected.
   */
  markUnavailable(
    gateway: GatewayId,
    reason: FallbackReason,
    modelId?: string
  ): void;
  isExhausted(gateway: GatewayId): boolean;
  unavailableReason(
    gateway: GatewayId,
    modelId?: string
  ): FallbackReason | undefined;
  isStale(gateway: GatewayId): boolean;
  snapshot(gateway: GatewayId): CreditSnapshot | undefined;
}

export interface CreditSnapshot {
  balance: number | null;
  checkedAt: number;
}

export interface UnavailableMark {
  reason: FallbackReason;
  until: number;
}

export interface TtlCacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface ModelRouterConfig {
  adapters: Partial<Record<GatewayId, GatewayAdapter>>;
  resolvePlan: (organizationId: string) => Promise<Plan>;
  /**
   * How strictly an organization wants zero data retention when the caller
   * does not say. Defaults to `required` for every organization.
   */
  resolveZdr?: (organizationId: string) => Promise<ZdrMode>;
  policy: RouterPolicyConfig;
  logger?: RouterLogger;
  planCacheTtlMs?: number;
  planCache?: PlanCacheStore;
  zdrCache?: ZdrCacheStore;
  creditCheckTtlMs?: number;
  now?: () => number;
}

export interface RoutedModelOptions {
  organizationId?: string;
  gateway?: GatewayId;
  zdr?: ZdrMode;
  logContext?: Partial<OperationalContext>;
}

export interface ModelRouter {
  model(modelId: string, options?: RoutedModelOptions): LanguageModelV4;
  resolveRoute(request: RouteRequest): Promise<RouteDecision>;
  assertRouteHasCredits(request: RouteRequest): Promise<RouteDecision>;
  getRouteMetadata(
    providerMetadata: SharedV4ProviderMetadata | undefined
  ): RouteMetadata | undefined;
  enrichRouteMetadata(metadata: RouteMetadata): Promise<RouteMetadata>;
  readonly adapters: Partial<Record<GatewayId, GatewayAdapter>>;
  readonly policy: RouterPolicyConfig;
}

export interface DecideGatewayInput {
  policy: RouterPolicyConfig;
  organizationId?: string;
  plan?: Plan;
  pinned?: GatewayId;
}

export interface GatewayDecision {
  gateway: GatewayId;
  reason: RouteReason;
}

export interface ResolverContext {
  adapters: Partial<Record<GatewayId, GatewayAdapter>>;
  policy: ModelRouterConfig["policy"];
  resolvePlan: ModelRouterConfig["resolvePlan"];
  resolveZdr: NonNullable<ModelRouterConfig["resolveZdr"]>;
  planCache: PlanCacheStore;
  zdrCache: ZdrCacheStore;
  planCacheTtlMs: number;
  logger: RouterLogger;
  credits: CreditTracker;
}

export interface PlanLookup {
  plan: Plan;
  source: PlanSource;
}

export interface UsableAdapter {
  adapter: GatewayAdapter;
  zdrEnforced: boolean;
  zdrRelaxed?: boolean;
}

export interface ResolvedRoute {
  decision: RouteDecision;
  adapter: GatewayAdapter;
  model: LanguageModelV4;
}

export interface RoutedModelContext {
  request: RouteRequest;
  policy: RouterPolicyConfig;
  adapters: Partial<Record<GatewayId, GatewayAdapter>>;
  logger: RouterLogger;
  credits: CreditTracker;
  resolve: (request: RouteRequest) => Promise<RouteDecision>;
}

export interface OpenRouterAdapterConfig {
  apiKey: string;
  headers?: Record<string, string>;
  baseURL?: string;
  fetch?: typeof fetch;
  /** Base URL for account endpoints (`/credits`, `/key`). */
  accountBaseURL?: string;
}

export interface VercelAdapterConfig {
  apiKey?: string;
  headers?: Record<string, string>;
  baseURL?: string;
  fetch?: typeof fetch;
}

export interface RouteUsageSummary {
  /** Route metadata of the last model call (gateway, upstream provider, ...). */
  route?: RouteMetadata;
  /** Prompt size of the largest step, for long-context pricing. */
  maxPromptTokens?: number;
  /** Reported modeled spend when complete, otherwise estimated token cost, summed per call. */
  tokenCostUsd?: number;
}

export interface RouteUsageStep {
  providerMetadata?: ProviderMetadata;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    inputTokenDetails?: {
      noCacheTokens?: number;
      cacheReadTokens?: number;
      cacheWriteTokens?: number;
    };
  };
}
