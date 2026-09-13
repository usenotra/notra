import type {
  CapturedNetworkRequest,
  CaptureResult,
  PostHog,
} from "posthog-js";

import {
  POSTHOG_DEFAULT_UI_HOST,
  POSTHOG_EU_UI_HOST,
  POSTHOG_MASKED_ORGANIZATION_SEGMENT,
  POSTHOG_URL_PROPERTY_PATTERN,
} from "@/constants/posthog-redaction";
import { maskOrganizationPathname } from "@/utils/organization-pathname";

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:\/\//i;

export function clearPostHogIdentity(posthog: PostHog): void {
  posthog.reset();
  posthog.resetGroups();
  posthog.unregister("organization_id");
  posthog.unregister("project_id");
}

export function stripUrlQueryAndHash(url: string): string {
  const queryIndex = url.indexOf("?");
  const hashIndex = url.indexOf("#");
  let redactionIndex = url.length;

  if (queryIndex >= 0) {
    redactionIndex = queryIndex;
  }
  if (hashIndex >= 0 && hashIndex < redactionIndex) {
    redactionIndex = hashIndex;
  }

  return url.slice(0, redactionIndex);
}

export function maskOrganizationInUrl(value: string): string {
  if (value.startsWith("/")) {
    return maskOrganizationPathname(value, POSTHOG_MASKED_ORGANIZATION_SEGMENT);
  }

  if (!ABSOLUTE_URL_PATTERN.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    url.pathname = maskOrganizationPathname(
      url.pathname,
      POSTHOG_MASKED_ORGANIZATION_SEGMENT
    );
    return url.toString();
  } catch {
    return value;
  }
}

export function redactPostHogUrl(value: string): string {
  return maskOrganizationInUrl(stripUrlQueryAndHash(value));
}

export function resolvePostHogUiHost(apiHost: string | undefined): string {
  if (apiHost?.includes("eu.")) {
    return POSTHOG_EU_UI_HOST;
  }
  return POSTHOG_DEFAULT_UI_HOST;
}

export function redactPostHogNetworkRequest(
  request: CapturedNetworkRequest
): CapturedNetworkRequest {
  return {
    ...request,
    name: redactPostHogUrl(request.name),
  };
}

function redactUrlProperties(
  properties: CaptureResult["properties"]
): CaptureResult["properties"] {
  if (!properties) {
    return properties;
  }

  const redacted: Record<string, unknown> = { ...properties };
  for (const [key, value] of Object.entries(redacted)) {
    if (typeof value === "string" && POSTHOG_URL_PROPERTY_PATTERN.test(key)) {
      redacted[key] = redactPostHogUrl(value);
    }
  }

  return redacted;
}

export function redactPostHogEvent(
  event: CaptureResult | null
): CaptureResult | null {
  if (!event) {
    return null;
  }

  return {
    ...event,
    properties: redactUrlProperties(event.properties),
    $set: event.$set ? redactUrlProperties(event.$set) : undefined,
    $set_once: event.$set_once
      ? redactUrlProperties(event.$set_once)
      : undefined,
  };
}
