import type { POSTHOG_GROUP_TYPES } from "@notra/posthog/constants/posthog";
import type { PostHogEventName } from "@notra/posthog/events";
import type { PostHog } from "posthog-node";

export type PostHogPropertyValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly string[]
  | readonly number[];

export type PostHogProperties = Record<string, PostHogPropertyValue>;

export type PostHogGroupType =
  (typeof POSTHOG_GROUP_TYPES)[keyof typeof POSTHOG_GROUP_TYPES];

export type PostHogGroups = Partial<Record<PostHogGroupType, string>>;

export interface PostHogRequestContext {
  distinctId: string | null;
  sessionId: string | null;
}

export interface PostHogServerEventInput {
  event: PostHogEventName;
  distinctId?: string | null;
  organizationId?: string | null;
  projectId?: string | null;
  sessionId?: string | null;
  properties?: PostHogProperties;
}

export interface PostHogServerExceptionInput {
  error: unknown;
  distinctId?: string | null;
  organizationId?: string | null;
  sessionId?: string | null;
  properties?: PostHogProperties;
}

export interface PostHogGroupIdentifyInput {
  groupType: PostHogGroupType;
  groupKey: string;
  properties?: PostHogProperties;
  distinctId?: string | null;
}

export interface PostHogPersonPropertiesInput {
  distinctId: string;
  set?: PostHogProperties;
  setOnce?: PostHogProperties;
}
export interface PostHogServerFlush {
  client: PostHog;
  revision: number;
  promise: Promise<boolean>;
}
