import type {
  JSONObject,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  SharedV3ProviderMetadata,
} from "@ai-sdk/provider";
import {
  HTTP_NOT_FOUND,
  HTTP_PAYMENT_REQUIRED,
  HTTP_SERVER_ERROR_MIN,
  OPENROUTER_NO_ZDR_ENDPOINT_PATTERN,
  NO_TRAINING_PROVIDER_ERROR_PATTERN,
  RETRYABLE_STATUS_CODES,
  ROUTED_MODEL_PROVIDER,
  ROUTER_METADATA_KEY,
  ZDR_ERROR_PATTERN,
  ZDR_REJECTION_STATUS_CODES,
} from "@notra/ai/constants/router";
import type {
  FallbackReason,
  GatewayAdapter,
  GatewayId,
  ResolvedRoute,
  RouteDecision,
  RoutedModelContext,
  RouteMetadata,
} from "@notra/ai/types/router";
import { createModelCallTelemetry } from "@notra/ai/utils/model-call-telemetry";
import { observeModelStream } from "@notra/ai/utils/observe-model-stream";

import { otherGateway } from "./policy";
import {
  splitRouterOptions,
  stripForeignGatewayOptions,
} from "./provider-options";

function readStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const record = error as Record<string, unknown>;
  const candidate = record.statusCode ?? record.status;
  return typeof candidate === "number" ? candidate : undefined;
}

function readBodyText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value !== "object" || value === null) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

/**
 * Message plus any response body the SDK attached. The gateway error classes
 * keep an unparsed body on `response` (and the core `APICallError` on
 * `responseBody`), and that is where rejection types like
 * `no_providers_available` live when the body does not fit the SDK's schema.
 */
function readMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (typeof error !== "object" || error === null) {
    return "";
  }
  const record = error as Record<string, unknown>;
  const parts = [
    error instanceof Error ? error.message : "",
    readBodyText(record.response),
    readBodyText(record.responseBody),
  ];
  return parts.filter((part) => part.length > 0).join(" ");
}

function readIsRetryable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  return (error as Record<string, unknown>).isRetryable === true;
}

/**
 * Decide whether a failed upstream call may be retried on the other gateway
 * and why. Returns undefined for errors that must surface to the caller
 * (validation errors, aborts, auth errors, ...).
 */
export function classifyUpstreamFailure(
  error: unknown
): FallbackReason | undefined {
  if (error instanceof Error && error.name === "AbortError") {
    return undefined;
  }
  const status = readStatusCode(error);
  if (status === HTTP_PAYMENT_REQUIRED) {
    return "no-credits";
  }
  if (NO_TRAINING_PROVIDER_ERROR_PATTERN.test(readMessage(error))) {
    return "non-compliant";
  }
  if (
    status !== undefined &&
    ZDR_REJECTION_STATUS_CODES.has(status) &&
    ZDR_ERROR_PATTERN.test(readMessage(error))
  ) {
    // The gateway refused to honour the zero-data-retention requirement:
    // Vercel answers 400 when no ZDR provider serves the model and 403 when
    // the team plan lacks ZDR. Either way the route is not compliant.
    return "non-compliant";
  }
  if (
    status === HTTP_NOT_FOUND &&
    OPENROUTER_NO_ZDR_ENDPOINT_PATTERN.test(readMessage(error))
  ) {
    // OpenRouter found the model but no host satisfies the ZDR data policy.
    return "non-compliant";
  }
  if (status === HTTP_NOT_FOUND) {
    return "unsupported-model";
  }
  if (
    status !== undefined &&
    (status >= HTTP_SERVER_ERROR_MIN || RETRYABLE_STATUS_CODES.has(status))
  ) {
    return "upstream-error";
  }
  if (readIsRetryable(error)) {
    return "upstream-error";
  }
  if (status === undefined && error instanceof TypeError) {
    // fetch() network failures surface as TypeError without a status.
    return "upstream-error";
  }
  return undefined;
}

export function buildRouteMetadata(
  decision: RouteDecision,
  adapter: GatewayAdapter,
  providerMetadata: SharedV3ProviderMetadata | undefined
): RouteMetadata {
  const extracted = adapter.extractRouteMetadata(providerMetadata);
  return {
    gateway: decision.gateway,
    requestedModel: decision.requestedModelId,
    model: extracted.model ?? decision.modelId,
    reason: decision.reason,
    ...(decision.plan ? { plan: decision.plan } : {}),
    ...(extracted.generationId ? { generationId: extracted.generationId } : {}),
    ...(extracted.upstreamProvider
      ? { upstreamProvider: extracted.upstreamProvider }
      : {}),
    ...(decision.fallbackFrom ? { fallbackFrom: decision.fallbackFrom } : {}),
    ...(decision.fallbackReason
      ? { fallbackReason: decision.fallbackReason }
      : {}),
    zdrEnforced: decision.zdrEnforced,
  };
}

function annotateProviderMetadata(
  providerMetadata: SharedV3ProviderMetadata | undefined,
  route: ResolvedRoute
): SharedV3ProviderMetadata {
  const metadata = buildRouteMetadata(
    route.decision,
    route.adapter,
    providerMetadata
  );
  return {
    ...providerMetadata,
    [ROUTER_METADATA_KEY]: metadata as unknown as JSONObject,
  };
}

function annotateStream(
  stream: ReadableStream<LanguageModelV3StreamPart>,
  route: ResolvedRoute
): ReadableStream<LanguageModelV3StreamPart> {
  let observedProviderMetadata: SharedV3ProviderMetadata | undefined;
  return stream.pipeThrough(
    new TransformStream<LanguageModelV3StreamPart, LanguageModelV3StreamPart>({
      transform(part, controller) {
        if ("providerMetadata" in part && part.providerMetadata) {
          observedProviderMetadata = {
            ...observedProviderMetadata,
            ...part.providerMetadata,
          };
        }
        if (part.type === "finish") {
          controller.enqueue({
            ...part,
            providerMetadata: annotateProviderMetadata(
              observedProviderMetadata,
              route
            ),
          });
          return;
        }
        controller.enqueue(part);
      },
    })
  );
}

function decisionLogFields(decision: RouteDecision) {
  return {
    organizationId: decision.organizationId,
    plan: decision.plan,
    planSource: decision.planSource,
    gateway: decision.gateway,
    requestedModel: decision.requestedModelId,
    model: decision.modelId,
    reason: decision.reason,
    fallbackFrom: decision.fallbackFrom,
    fallbackReason: decision.fallbackReason,
    zdr: decision.zdr,
    zdrEnforced: decision.zdrEnforced,
    zdrRelaxed: decision.zdrRelaxed,
  };
}

/**
 * LanguageModelV3 that resolves its route (plan lookup, gateway choice,
 * privacy options) lazily on first use and delegates to the concrete gateway
 * model. Compatible with wrapLanguageModel/middleware wrappers because it
 * only exposes the V3 surface.
 */
export class RoutedLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = "v3" as const;
  readonly provider = ROUTED_MODEL_PROVIDER;
  readonly modelId: string;
  readonly supportedUrls: PromiseLike<Record<string, RegExp[]>>;

  private readonly context: RoutedModelContext;
  private routePromise: Promise<ResolvedRoute> | undefined;
  /** Set once a `zdr: "preferred"` request has dropped the ZDR flag. */
  private zdrRelaxed = false;

  constructor(context: RoutedModelContext) {
    this.context = context;
    this.modelId = context.request.modelId;
    // Lazy thenable: wrappers read `supportedUrls` eagerly, and we must not
    // start route resolution (or leak rejections) before the first call.
    this.supportedUrls = {
      // biome-ignore lint/suspicious/noThenProperty: intentional lazy thenable so wrappers can read supportedUrls without triggering resolution
      then: (onFulfilled, onRejected) =>
        this.getRoute()
          .then((route) => route.model.supportedUrls)
          .then(onFulfilled, onRejected),
    };
  }

  async doGenerate(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3GenerateResult> {
    const telemetry = createModelCallTelemetry({
      logger: this.context.logger,
      request: this.context.request,
      operation: "generate",
      signal: options.abortSignal,
    });
    try {
      const result = await this.execute(options, async (route, params) => {
        telemetry.attempt(route);
        const generated = await route.model.doGenerate(params);
        return {
          ...generated,
          providerMetadata: annotateProviderMetadata(
            generated.providerMetadata,
            route
          ),
        };
      });
      telemetry.complete({ ...result, responseId: result.response?.id });
      return result;
    } catch (error) {
      telemetry.fail(error);
      throw error;
    }
  }

  async doStream(
    options: LanguageModelV3CallOptions
  ): Promise<LanguageModelV3StreamResult> {
    const telemetry = createModelCallTelemetry({
      logger: this.context.logger,
      request: this.context.request,
      operation: "stream",
      signal: options.abortSignal,
    });
    try {
      return await this.execute(options, async (route, params) => {
        telemetry.attempt(route);
        const result = await route.model.doStream(params);
        return {
          ...result,
          stream: observeModelStream(
            annotateStream(result.stream, route),
            telemetry
          ),
        };
      });
    } catch (error) {
      telemetry.fail(error);
      throw error;
    }
  }

  private getRoute(): Promise<ResolvedRoute> {
    if (!this.routePromise) {
      const promise = this.resolvePrimary();
      this.routePromise = promise;
      // Do not memoise failures so a later call can retry resolution.
      promise.catch(() => {
        if (this.routePromise === promise) {
          this.routePromise = undefined;
        }
      });
    }
    return this.routePromise;
  }

  private async resolvePrimary(): Promise<ResolvedRoute> {
    const decision = await this.context.resolve(this.context.request);
    const route = this.materialize(decision);
    this.context.logger.info("ai.router.route", decisionLogFields(decision));
    return route;
  }

  private materialize(decision: RouteDecision): ResolvedRoute {
    const adapter = this.context.adapters[decision.gateway];
    if (!adapter) {
      throw new Error(
        `Router resolved gateway "${decision.gateway}" but no adapter is registered.`
      );
    }
    return {
      decision,
      adapter,
      model: adapter.createModel(decision.requestedModelId),
    };
  }

  private buildParams(
    route: ResolvedRoute,
    options: LanguageModelV3CallOptions
  ): LanguageModelV3CallOptions {
    const { router, rest } = splitRouterOptions(options.providerOptions);
    const providerOptions = route.adapter.buildProviderOptions({
      providerOptions: stripForeignGatewayOptions(route.decision.gateway, rest),
      router,
      allowNonZdr: this.context.policy.allowNonZdr,
      relaxZdr: this.zdrRelaxed || route.decision.zdrRelaxed === true,
    });
    return { ...options, providerOptions };
  }

  private async execute<T>(
    options: LanguageModelV3CallOptions,
    run: (
      route: ResolvedRoute,
      params: LanguageModelV3CallOptions
    ) => Promise<T>
  ): Promise<T> {
    const route = await this.getRoute();
    try {
      return await run(route, this.buildParams(route, options));
    } catch (error) {
      const fallback = await this.tryFallbackRoute(route, error);
      if (!fallback) {
        throw error;
      }
      return await run(fallback, this.buildParams(fallback, options));
    }
  }

  private canRelaxZdr(route: ResolvedRoute): boolean {
    return (
      route.decision.zdr === "preferred" &&
      !this.zdrRelaxed &&
      route.decision.zdrRelaxed !== true
    );
  }

  /**
   * The caller accepts a non-ZDR route for this model: retry on the same
   * gateway without the ZDR flag. The gateway is not marked unavailable so
   * strict requests keep their own behaviour.
   */
  private relaxZdr(route: ResolvedRoute, error: unknown): ResolvedRoute {
    this.zdrRelaxed = true;
    const decision: RouteDecision = {
      ...route.decision,
      zdrEnforced: false,
      zdrRelaxed: true,
    };
    this.context.logger.warn("ai.router.zdr_bypassed", {
      ...decisionLogFields(decision),
      bypassReason: "caller-preferred",
      message: readMessage(error),
    });
    const relaxedRoute: ResolvedRoute = { ...route, decision };
    this.routePromise = Promise.resolve(relaxedRoute);
    return relaxedRoute;
  }

  // A single 402 marks the shared gateway account exhausted for every request
  // in this process. Confirm with the gateway's balance endpoint so a spurious
  // 402 heals within one round-trip instead of blocking traffic for the TTL.
  private verifyExhaustion(gateway: GatewayId): void {
    const adapter = this.context.adapters[gateway];
    if (!adapter) {
      return;
    }
    adapter
      .getBalance()
      .then(({ balance }) => {
        this.context.credits.record(gateway, balance);
        this.context.logger.info("ai.router.credits_verified", {
          gateway,
          balance,
        });
      })
      .catch(() => {
        // Verification is best effort; keep the pessimistic mark.
      });
  }

  private async tryFallbackRoute(
    route: ResolvedRoute,
    error: unknown
  ): Promise<ResolvedRoute | undefined> {
    const reason = classifyUpstreamFailure(error);
    if (!reason) {
      return undefined;
    }
    if (reason === "no-credits") {
      this.context.credits.markExhausted(route.decision.gateway);
      this.verifyExhaustion(route.decision.gateway);
    } else if (reason === "non-compliant") {
      // A missing ZDR host is a fact about this model on this gateway, so the
      // mark is model-scoped: other models keep routing here.
      this.context.credits.markUnavailable(
        route.decision.gateway,
        reason,
        route.decision.requestedModelId
      );
      this.context.logger.error("ai.router.zdr_rejected", {
        gateway: route.decision.gateway,
        requestedModel: route.decision.requestedModelId,
        organizationId: route.decision.organizationId,
        zdr: route.decision.zdr,
        message: readMessage(error),
      });
    }

    // Prefer a ZDR-capable route on the other gateway over dropping the
    // flag; a `preferred` request only relaxes once no such route exists.
    const crossGateway = this.crossGatewayRoute(route, reason, error);
    if (crossGateway) {
      return crossGateway;
    }
    if (reason === "non-compliant" && this.canRelaxZdr(route)) {
      return this.relaxZdr(route, error);
    }
    return undefined;
  }

  private crossGatewayRoute(
    route: ResolvedRoute,
    reason: FallbackReason,
    error: unknown
  ): ResolvedRoute | undefined {
    if (
      !this.context.policy.crossGatewayFallback ||
      this.context.request.gateway
    ) {
      return undefined;
    }

    const target = otherGateway(route.decision.gateway);
    const adapter = this.context.adapters[target];
    const status = readStatusCode(error);
    const errorName = error instanceof Error ? error.name : typeof error;

    if (!adapter?.supportsModel(route.decision.requestedModelId)) {
      this.context.logger.warn("ai.router.fallback_unavailable", {
        from: route.decision.gateway,
        to: target,
        fallbackReason: reason,
        errorName,
        status,
      });
      return undefined;
    }
    const targetUnavailable = this.context.credits.unavailableReason(
      target,
      route.decision.requestedModelId
    );
    if (targetUnavailable) {
      this.context.logger.warn("ai.router.fallback_unavailable", {
        from: route.decision.gateway,
        to: target,
        fallbackReason: reason,
        targetReason: targetUnavailable,
        errorName,
        status,
      });
      return undefined;
    }
    if (!(adapter.enforcesZdr || this.context.policy.allowNonZdr)) {
      this.context.logger.error("ai.router.no_compliant_route", {
        from: route.decision.gateway,
        to: target,
        fallbackReason: reason,
        errorName,
        status,
      });
      return undefined;
    }

    const decision: RouteDecision = {
      ...route.decision,
      gateway: target,
      modelId: adapter.mapModelId(route.decision.requestedModelId),
      reason: "fallback",
      fallbackFrom: route.decision.gateway,
      fallbackReason: reason,
      zdrEnforced: adapter.enforcesZdr && !this.zdrRelaxed,
      zdrRelaxed: this.zdrRelaxed,
    };
    this.context.logger.warn("ai.router.fallback", {
      ...decisionLogFields(decision),
      errorName,
      status,
    });
    const fallbackRoute: ResolvedRoute = {
      decision,
      adapter,
      model: adapter.createModel(decision.requestedModelId),
    };
    // Subsequent calls on this model instance stay on the fallback gateway.
    this.routePromise = Promise.resolve(fallbackRoute);
    return fallbackRoute;
  }
}
