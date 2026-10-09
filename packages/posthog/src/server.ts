import {
  POSTHOG_DEFAULT_HOST,
  POSTHOG_GROUP_TYPES,
  POSTHOG_SERVER_FLUSH_AT,
  POSTHOG_SERVER_FLUSH_INTERVAL_MS,
  POSTHOG_SERVER_REQUEST_TIMEOUT_MS,
  POSTHOG_SERVICE_DISTINCT_ID_PREFIX,
} from "@notra/posthog/constants/posthog";
import type {
  PostHogGroupIdentifyInput,
  PostHogGroups,
  PostHogPersonPropertiesInput,
  PostHogProperties,
  PostHogServerEventInput,
  PostHogServerExceptionInput,
  PostHogServerFlush,
} from "@notra/posthog/types/posthog";
import { PostHog } from "posthog-node";

const PROJECT_TOKEN_ENV = "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN";

let client: PostHog | null | undefined;
let warnedMissingToken = false;
let captureRevision = 0;
let activeFlush: PostHogServerFlush | undefined;
let activeShutdown: Promise<void> | undefined;

function readHost(): string {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  if (!host || host.startsWith("/")) {
    return POSTHOG_DEFAULT_HOST;
  }
  return host;
}

function warnMissingToken(): void {
  if (warnedMissingToken || process.env.NODE_ENV !== "development") {
    return;
  }
  warnedMissingToken = true;
  console.error(
    `${PROJECT_TOKEN_ENV} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${PROJECT_TOKEN_ENV} is configured`
  );
}

export function getPostHogServer(): PostHog | null {
  if (client !== undefined) {
    return client;
  }

  const token = process.env[PROJECT_TOKEN_ENV]?.trim();
  if (!token) {
    warnMissingToken();
    client = null;
    return client;
  }

  client = new PostHog(token, {
    host: readHost(),
    flushAt: POSTHOG_SERVER_FLUSH_AT,
    flushInterval: POSTHOG_SERVER_FLUSH_INTERVAL_MS,
    requestTimeout: POSTHOG_SERVER_REQUEST_TIMEOUT_MS,
  });

  return client;
}

export function isPostHogServerEnabled(): boolean {
  return getPostHogServer() !== null;
}

function buildGroups(input: {
  organizationId?: string | null;
  projectId?: string | null;
}): PostHogGroups {
  const groups: PostHogGroups = {};
  if (input.organizationId) {
    groups[POSTHOG_GROUP_TYPES.ORGANIZATION] = input.organizationId;
  }
  if (input.projectId) {
    groups[POSTHOG_GROUP_TYPES.PROJECT] = input.projectId;
  }
  return groups;
}

function compactProperties(
  properties: PostHogProperties | undefined
): Record<string, unknown> {
  if (!properties) {
    return {};
  }
  const compacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) {
      compacted[key] = value;
    }
  }
  return compacted;
}

function resolveServiceDistinctId(
  organizationId: string | null | undefined
): string {
  return `${POSTHOG_SERVICE_DISTINCT_ID_PREFIX}${organizationId ?? "anonymous"}`;
}

export function captureServerEvent(input: PostHogServerEventInput): void {
  const posthog = getPostHogServer();
  if (!posthog) {
    return;
  }

  const hasIdentifiedActor = Boolean(input.distinctId);
  const distinctId =
    input.distinctId ?? resolveServiceDistinctId(input.organizationId);

  const properties: Record<string, unknown> = {
    ...compactProperties(input.properties),
    organization_id: input.organizationId ?? undefined,
    project_id: input.projectId ?? undefined,
  };
  if (input.sessionId) {
    properties.$session_id = input.sessionId;
  }
  if (!hasIdentifiedActor) {
    properties.$process_person_profile = false;
  }

  posthog.capture({
    distinctId,
    event: input.event,
    properties,
    groups: buildGroups(input),
  });
  captureRevision += 1;
}

export function captureServerException(
  input: PostHogServerExceptionInput
): void {
  const posthog = getPostHogServer();
  if (!posthog) {
    return;
  }

  const distinctId =
    input.distinctId ?? resolveServiceDistinctId(input.organizationId);
  const properties: Record<string, unknown> = {
    ...compactProperties(input.properties),
    organization_id: input.organizationId ?? undefined,
  };
  if (input.sessionId) {
    properties.$session_id = input.sessionId;
  }
  if (!input.distinctId) {
    properties.$process_person_profile = false;
  }
  if (input.organizationId) {
    properties.$groups = buildGroups(input);
  }

  posthog.captureException(input.error, distinctId, properties);
  captureRevision += 1;
}

export function identifyServerGroup(input: PostHogGroupIdentifyInput): void {
  const posthog = getPostHogServer();
  if (!posthog) {
    return;
  }

  posthog.groupIdentify({
    groupType: input.groupType,
    groupKey: input.groupKey,
    properties: compactProperties(input.properties),
    distinctId:
      input.distinctId ?? `${POSTHOG_SERVICE_DISTINCT_ID_PREFIX}groups`,
  });
  captureRevision += 1;
}

export function setServerPersonProperties(
  input: PostHogPersonPropertiesInput
): void {
  const posthog = getPostHogServer();
  if (!posthog) {
    return;
  }

  posthog.identify({
    distinctId: input.distinctId,
    properties: {
      $set: compactProperties(input.set),
      $set_once: compactProperties(input.setOnce),
    },
  });
  captureRevision += 1;
}

export async function flushPostHogServer(): Promise<void> {
  if (activeShutdown) {
    return activeShutdown;
  }
  const posthog = getPostHogServer();
  if (!posthog) {
    return;
  }
  const targetRevision = captureRevision;
  let previous = activeFlush;
  while (previous?.client === posthog) {
    const succeeded = await previous.promise;
    if (!succeeded || previous.revision >= targetRevision) {
      return;
    }
    previous = activeFlush;
  }

  const pending: PostHogServerFlush = {
    client: posthog,
    revision: captureRevision,
    promise: Promise.resolve()
      .then(() => posthog.flush())
      .then(
        () => true,
        (error) => {
          console.error("[posthog] flush failed", error);
          return false;
        }
      ),
  };
  activeFlush = pending;
  try {
    await pending.promise;
  } finally {
    if (activeFlush === pending) {
      activeFlush = undefined;
    }
  }
}

export async function shutdownPostHogServer(): Promise<void> {
  if (activeShutdown) {
    return activeShutdown;
  }
  const posthog = getPostHogServer();
  if (!posthog) {
    return;
  }
  const draining =
    activeFlush?.client === posthog ? flushPostHogServer() : Promise.resolve();
  activeShutdown = draining
    .then(() => posthog.shutdown())
    .catch((error) => {
      console.error("[posthog] shutdown failed", error);
    })
    .finally(() => {
      client = undefined;
      activeShutdown = undefined;
    });
  return activeShutdown;
}
