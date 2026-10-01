import type { DynamicResolveContext } from "eve";

import type { ContentTaskResult } from "../../agent/lib/types/content-task";

export const taskPrincipal: NonNullable<
  DynamicResolveContext["session"]["auth"]["current"]
> = {
  authenticator: "service-auth",
  principalId: "dashboard",
  principalType: "service",
  attributes: { surface: "task" },
};

export const taskModelContext: DynamicResolveContext = {
  model: null,
  channel: { kind: "http" },
  messages: [],
  session: {
    id: "session-test",
    auth: {
      current: taskPrincipal,
      initiator: null,
    },
  },
};

export const savedContentResult: ContentTaskResult = {
  status: "created",
  posts: [{ postId: "post-test", title: "Changelog", recommendations: null }],
  reason: null,
};
