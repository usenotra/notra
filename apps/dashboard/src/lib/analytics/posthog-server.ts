import { POSTHOG_GROUP_TYPES } from "@notra/posthog/constants/posthog";
import {
  getPostHogRequestContext,
  resolvePostHogDistinctId,
} from "@notra/posthog/request";
import {
  captureServerEvent,
  captureServerException,
  flushPostHogServer,
  identifyServerGroup,
  setServerPersonProperties,
} from "@notra/posthog/server";
import { after } from "next/server";

import type {
  IdentifyOrganizationGroupInput,
  IdentifyProjectGroupInput,
  SetPersonPropertiesInput,
  TrackServerEventInput,
  TrackServerExceptionInput,
} from "@/types/analytics/posthog";

function scheduleCapture(capture: () => void): void {
  // Capture itself can start network work. Keep both capture and delivery in
  // Next's supported lifetime, including during prerendering. Workflows use
  // trackServerEventAndFlush instead of relying on a request context.
  after(async () => {
    capture();
    await flushPostHogServer();
  });
}

export function trackServerEvent(input: TrackServerEventInput): void {
  const requestContext = getPostHogRequestContext(input.headers);
  scheduleCapture(() =>
    captureServerEvent({
      event: input.event,
      distinctId: resolvePostHogDistinctId(requestContext, input.userId),
      sessionId: requestContext.sessionId,
      organizationId: input.organizationId,
      projectId: input.projectId,
      properties: input.properties,
    })
  );
}

export async function trackServerEventAndFlush(
  input: TrackServerEventInput
): Promise<void> {
  const requestContext = getPostHogRequestContext(input.headers);
  captureServerEvent({
    event: input.event,
    distinctId: resolvePostHogDistinctId(requestContext, input.userId),
    sessionId: requestContext.sessionId,
    organizationId: input.organizationId,
    projectId: input.projectId,
    properties: input.properties,
  });
  await flushPostHogServer();
}

export function trackServerException(input: TrackServerExceptionInput): void {
  const requestContext = getPostHogRequestContext(input.headers);
  scheduleCapture(() =>
    captureServerException({
      error: input.error,
      distinctId: resolvePostHogDistinctId(requestContext, input.userId),
      sessionId: requestContext.sessionId,
      organizationId: input.organizationId,
      properties: input.properties,
    })
  );
}

export function identifyOrganizationGroup(
  input: IdentifyOrganizationGroupInput
): void {
  scheduleCapture(() =>
    identifyServerGroup({
      groupType: POSTHOG_GROUP_TYPES.ORGANIZATION,
      groupKey: input.organizationId,
      properties: input.properties,
      distinctId: input.userId,
    })
  );
}

export function identifyProjectGroup(input: IdentifyProjectGroupInput): void {
  scheduleCapture(() =>
    identifyServerGroup({
      groupType: POSTHOG_GROUP_TYPES.PROJECT,
      groupKey: input.projectId,
      properties: {
        ...input.properties,
        organization_id: input.organizationId,
      },
      distinctId: input.userId,
    })
  );
}

export function setPersonProperties(input: SetPersonPropertiesInput): void {
  scheduleCapture(() =>
    setServerPersonProperties({
      distinctId: input.userId,
      set: input.set,
      setOnce: input.setOnce,
    })
  );
}
