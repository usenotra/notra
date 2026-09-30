import "zod/compile";
import { z } from "@hono/zod-openapi";

import { organizationResponseSchema } from "./content";

const workspaceMembershipSchema = organizationResponseSchema.extend({
  role: z.string().nullable(),
  status: z.enum(["active", "pending"]),
  isCurrent: z.boolean(),
});

const workspaceAuthenticationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("apiKey") }),
  z.object({
    type: z.literal("oauth"),
    accountId: z.string(),
    scopes: z.array(z.string()),
  }),
]);

export const getWorkspacesQuerySchema = z.object({
  includePending: z.literal("true").optional(),
});

export const getWorkspacesResponseSchema = z
  .object({
    currentWorkspace: organizationResponseSchema,
    workspaces: z.array(workspaceMembershipSchema),
    authentication: workspaceAuthenticationSchema,
  })
  .openapi("GetWorkspacesResponse");
