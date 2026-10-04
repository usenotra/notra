import { describe, expect, mock, test } from "bun:test";

import { workspaceRoutes } from "../src/routes/workspaces";
import type { AuthData } from "../src/types/auth";
import { createOpenApiApp } from "../src/utils/openapi-app";
import { getWorkspaceContext } from "../src/utils/workspaces";

const currentWorkspace = {
  id: "org_current",
  slug: "current",
  name: "Current workspace",
  logo: null,
};

function createDb(
  workspaces = [
    {
      role: "owner",
      organizations: currentWorkspace,
    },
  ],
  pendingOrganizations = []
) {
  return {
    query: {
      organizations: {
        findFirst: mock(async () => currentWorkspace),
        findMany: mock(async () => pendingOrganizations),
      },
      members: {
        findMany: mock(async () => workspaces),
      },
      users: {
        findFirst: mock(async () => ({ email: "member@example.com" })),
      },
    },
  };
}

function createWorkspaceApp(auth: AuthData, db = createDb()) {
  const app = createOpenApiApp();
  app.use("*", async (c, next) => {
    c.set("auth", auth);
    c.set("db", db);
    await next();
  });
  app.route("/", workspaceRoutes);
  return app;
}

describe("workspace context", () => {
  test("API keys only receive their current workspace", async () => {
    const db = createDb();
    const auth = {
      keyId: "key_test",
      identity: { externalId: currentWorkspace.id },
    } as AuthData;

    const response = await getWorkspaceContext(db, auth, currentWorkspace.id);

    expect(response).toEqual({
      currentWorkspace,
      workspaces: [
        {
          ...currentWorkspace,
          role: null,
          status: "active",
          isCurrent: true,
        },
      ],
      authentication: { type: "apiKey" },
    });
    expect(db.query.members.findMany).not.toHaveBeenCalled();
    expect(db.query.users.findFirst).not.toHaveBeenCalled();
  });

  test("adds only safe pending workspace details for OAuth users", async () => {
    const pendingWorkspace = {
      id: "org_pending",
      slug: "pending",
      name: "Pending workspace",
      logo: null,
      workosOrgId: "workos_org_pending",
    };
    const unrelatedWorkspace = {
      id: "org_unrelated",
      slug: "unrelated",
      name: "Unrelated workspace",
      logo: null,
      workosOrgId: "workos_org_unrelated",
    };
    const db = createDb(
      [{ role: "admin", organizations: currentWorkspace }],
      [pendingWorkspace, unrelatedWorkspace]
    );
    const auth: AuthData = {
      type: "oauth",
      keyId: "oauth:user_test:org_current",
      userId: "user_test",
      scopes: [],
      identity: { externalId: currentWorkspace.id },
    };
    const loadPendingInvitations = mock(async (email: string) => {
      expect(email).toBe("member@example.com");
      return [
        {
          organizationId: "workos_org_pending",
          role: "member",
          token: "must-not-leak",
          acceptInvitationUrl: "https://must-not-leak.example",
        },
      ];
    });

    const response = await getWorkspaceContext(
      db,
      auth,
      currentWorkspace.id,
      loadPendingInvitations
    );

    expect(response?.workspaces).toEqual([
      {
        ...currentWorkspace,
        role: "admin",
        status: "active",
        isCurrent: true,
      },
      {
        id: pendingWorkspace.id,
        slug: pendingWorkspace.slug,
        name: pendingWorkspace.name,
        logo: pendingWorkspace.logo,
        role: "member",
        status: "pending",
        isCurrent: false,
      },
    ]);
    expect(JSON.stringify(response)).not.toMatch(
      /must-not-leak|acceptInvitationUrl|member@example.com|workos_org_pending/
    );
  });

  test("rejects public ingest tokens", async () => {
    const response = await createWorkspaceApp({
      type: "ingest",
      keyId: "feedback:org_current:-",
      scopes: ["feedback.write"],
      projectId: null,
      identity: { externalId: currentWorkspace.id },
    }).request("/me/workspaces?includePending=true");

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Forbidden: ingest tokens cannot access workspace discovery",
    });
  });

  test("fails closed when OAuth invitation discovery is unavailable", async () => {
    const response = await createWorkspaceApp({
      type: "oauth",
      keyId: "oauth:user_test:org_current",
      userId: "user_test",
      scopes: [],
      identity: { externalId: currentWorkspace.id },
    }).request("/me/workspaces?includePending=true");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Authentication service unavailable",
    });
  });
});
