import { createRoute } from "@hono/zod-openapi";
import {
  getWorkspacesQuerySchema,
  getWorkspacesResponseSchema,
} from "@notra/schemas/api/workspaces";

import { WorkspaceInvitationServiceError } from "../errors/workspaces";
import {
  getOrganizationIdFromAuth,
  isIngestAuth,
  isOAuthAuth,
} from "../types/auth";
import { createOpenApiApp } from "../utils/openapi-app";
import { errorResponse } from "../utils/openapi-responses";
import { listPendingWorkspaceInvitations } from "../utils/workos-invitations";
import { getWorkspaceContext } from "../utils/workspaces";

export const workspaceRoutes = createOpenApiApp();

const getWorkspacesRoute = createRoute({
  method: "get",
  path: "/me/workspaces",
  tags: ["Discovery"],
  operationId: "getWorkspaces",
  summary: "Get authenticated workspace context",
  description:
    "Returns the current workspace and authentication details. OAuth users also receive their accepted memberships and can opt into pending invitations; organization API keys only receive their current workspace. Discovery does not change the workspace bound to the bearer token.",
  request: {
    query: getWorkspacesQuerySchema,
  },
  responses: {
    200: {
      description: "Workspace context fetched successfully",
      content: {
        "application/json": { schema: getWorkspacesResponseSchema },
      },
    },
    400: errorResponse("Invalid query parameters"),
    401: errorResponse("Missing or invalid bearer token"),
    403: errorResponse("Bearer token is not scoped to an organization"),
    404: errorResponse("Current workspace not found"),
    503: errorResponse("Authentication service unavailable"),
  },
});

workspaceRoutes.openapi(getWorkspacesRoute, async (c) => {
  const auth = c.get("auth");
  if (isIngestAuth(auth)) {
    return c.json(
      { error: "Forbidden: ingest tokens cannot access workspace discovery" },
      403
    );
  }

  const currentWorkspaceId = getOrganizationIdFromAuth(auth);
  if (!currentWorkspaceId) {
    return c.json(
      { error: "Forbidden: bearer token must be scoped to an organization" },
      403
    );
  }

  const includePending = c.req.valid("query").includePending === "true";
  const workosApiKey = c.env?.WORKOS_API_KEY;
  if (isOAuthAuth(auth) && includePending && !workosApiKey) {
    return c.json({ error: "Authentication service unavailable" }, 503);
  }

  let response;
  try {
    response = await getWorkspaceContext(
      c.get("db"),
      auth,
      currentWorkspaceId,
      includePending && workosApiKey
        ? (email) => listPendingWorkspaceInvitations(workosApiKey, email)
        : undefined
    );
  } catch (error) {
    if (error instanceof WorkspaceInvitationServiceError) {
      return c.json({ error: "Authentication service unavailable" }, 503);
    }
    throw error;
  }
  if (!response) {
    return c.json({ error: "Current workspace not found" }, 404);
  }

  return c.json(response, 200);
});
