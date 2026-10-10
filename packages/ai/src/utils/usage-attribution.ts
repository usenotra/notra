import type { SharedV4ProviderOptions } from "@ai-sdk/provider";
import {
  GATEWAY_MAX_REPORTING_TAG_LENGTH,
  GATEWAY_MAX_REPORTING_TAGS,
  USAGE_CORRELATION_FIELDS,
} from "@notra/ai/constants/usage-attribution";
import type { OperationalContext } from "@notra/ai/types/operational-log";
import type { TccMetadata } from "@notra/ai/types/tcc";
import {
  getOperationalContext,
  runWithOperationalContext,
} from "@notra/ai/utils/operational-context";

/** All subcalls of one background generation share its job/run identity. */
export function withUsageContext<T>(
  organizationId: string,
  metadata: TccMetadata | undefined,
  operation: () => T
): T {
  const parent = getOperationalContext();
  const context: OperationalContext = {
    ...parent,
    organizationId,
    requestId: parent?.requestId ?? crypto.randomUUID(),
    runId: parent?.runId ?? crypto.randomUUID(),
  };
  for (const field of USAGE_CORRELATION_FIELDS) {
    if (typeof metadata?.[field] === "string") {
      context[field] = metadata[field];
    }
  }
  if (!metadata?.runId && typeof metadata?.jobId === "string") {
    context.runId = metadata.jobId;
  }
  return runWithOperationalContext(context, operation);
}

/** Reporting metadata only: never modifies prompts, routing or billing. */
export function withUsageAttribution(
  providerOptions: SharedV4ProviderOptions = {},
  context: Partial<OperationalContext> = {}
) {
  const resolved = { ...getOperationalContext() };
  for (const [field, value] of Object.entries(context)) {
    if (value !== undefined) {
      Object.assign(resolved, { [field]: value });
    }
  }
  const gateway = providerOptions.gateway ?? {};
  const existing = Array.isArray(gateway.tags)
    ? gateway.tags.filter(
        (tag): tag is string =>
          typeof tag === "string" &&
          tag.length > 0 &&
          tag.length <= GATEWAY_MAX_REPORTING_TAG_LENGTH &&
          !tag.includes(",")
      )
    : ["other"];
  const primary = existing.find(
    (tag) => !tag.includes(":") && tag.length <= 56
  );
  const feature =
    existing.find((tag) => tag.startsWith("feature:") && tag.length > 8) ??
    `feature:${primary ?? "other"}`;
  const correlations = USAGE_CORRELATION_FIELDS.flatMap((field) => {
    const value = resolved[field];
    const tag = `${field}:${value}`;
    // Never truncate an ID into a different identity. Full IDs remain in logs.
    return typeof value === "string" &&
      value.length > 0 &&
      tag.length <= GATEWAY_MAX_REPORTING_TAG_LENGTH &&
      !tag.includes(",")
      ? [tag]
      : [];
  });
  const tags = [
    ...new Set([
      feature,
      ...(primary ? [primary] : []),
      ...correlations,
      ...existing.filter(
        (tag) =>
          !tag.startsWith("feature:") &&
          !tag.startsWith("attribution:") &&
          !USAGE_CORRELATION_FIELDS.some(
            (field) => resolved[field] && tag.startsWith(`${field}:`)
          )
      ),
    ]),
  ].slice(0, GATEWAY_MAX_REPORTING_TAGS - 1);
  const user =
    gateway.user === undefined ? resolved.organizationId : gateway.user;
  const complete =
    typeof user === "string" &&
    user.length > 0 &&
    feature !== "feature:other" &&
    tags.some((tag) =>
      /^(runId|scanId|sessionId|chatId|requestId):./.test(tag)
    );
  tags.push(`attribution:${complete ? "complete" : "partial"}`);
  return {
    ...providerOptions,
    gateway: {
      ...gateway,
      tags,
      ...(gateway.user === undefined && resolved.organizationId
        ? { user: resolved.organizationId }
        : {}),
    },
  };
}

/** Read back context for direct agent calls outside AsyncLocalStorage. */
export function getUsageAttribution(providerOptions?: SharedV4ProviderOptions) {
  const gateway = providerOptions?.gateway;
  const tags = Array.isArray(gateway?.tags) ? gateway.tags : [];
  const context: Partial<OperationalContext> = {};
  for (const field of USAGE_CORRELATION_FIELDS) {
    const tag = tags.find(
      (value) => typeof value === "string" && value.startsWith(`${field}:`)
    );
    if (typeof tag === "string") {
      context[field] = tag.slice(field.length + 1);
    }
  }
  const featureTag = tags.find(
    (tag) => typeof tag === "string" && tag.startsWith("feature:")
  );
  return {
    ...context,
    organizationId:
      typeof gateway?.user === "string" ? gateway.user : undefined,
    feature: typeof featureTag === "string" ? featureTag.slice(8) : "other",
  };
}

/** Eve expects JSON without undefined values in its model selection options. */
export function gatewayAttributionOptions(
  context: Partial<OperationalContext>
) {
  const gateway = withUsageAttribution({}, context).gateway;
  return {
    tags: gateway.tags.filter(
      (tag) =>
        tag !== "other" &&
        !tag.startsWith("feature:") &&
        !tag.startsWith("attribution:")
    ),
    ...(typeof gateway?.user === "string" ? { user: gateway.user } : {}),
  };
}

/** Box stamps these only on gateway traffic, including restored snapshots. */
export function gatewayReportingHeaders(
  feature: string,
  context: Partial<OperationalContext>
) {
  const gateway = withUsageAttribution(
    { gateway: { tags: [feature] } },
    context
  ).gateway;
  return {
    "ai-gateway.vercel.sh": {
      "ai-reporting-tags": gateway.tags.join(","),
      ...(typeof gateway?.user === "string"
        ? { "ai-reporting-user": gateway.user }
        : {}),
    },
  };
}
