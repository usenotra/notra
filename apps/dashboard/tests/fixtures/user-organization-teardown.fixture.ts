import { beforeEach, expect, mock, test } from "bun:test";

import { call, os } from "@orpc/server";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { Effect } from "effect";

import { createORPCContext } from "../../src/lib/orpc/context";
import type { ORPCContext } from "../../src/types/orpc/context";
import { owner } from "../constants/user-organization-teardown";

const events: string[] = [];

let membership: typeof owner | null = null;
let membershipCount = 2;
let organizationExists = true;
let failTeardown = false;
const tx = {
  query: {
    members: {
      findFirst: async ({ where }: Record<"where", SQL>) => {
        const query = new PgDialect().sqlToQuery(where);
        if (query.params.includes("owner") && membership?.role !== "owner") {
          return null;
        }
        return membership;
      },
    },
    organizations: {
      findFirst: async () =>
        organizationExists ? { id: "workspace", workosOrgId: null } : null,
    },
  },
  select: () => ({
    from: () => ({
      where: () => ({
        for: async () => [],
        then: (resolve: (rows: { count: number }[]) => void) =>
          resolve([{ count: membershipCount }]),
      }),
    }),
  }),
  delete: () => ({
    where: async () => {
      events.push("cascade");
    },
  }),
};
const teardown = mock(async (id: string, executor: unknown) => {
  expect(id).toBe("workspace");
  expect(executor).toBe(tx);
  events.push("teardown");
  if (failTeardown) {
    throw new Error("Synthetic teardown failure");
  }
});

mock.module("@notra/db/drizzle", () => ({
  db: {
    transaction: async (run: (executor: typeof tx) => unknown) => await run(tx),
  },
}));
mock.module("@notra/sites-server/organization", () => ({
  deleteOrganizationSites: teardown,
}));
mock.module("@notra/ai/utils/server-log", () => ({ logError: mock() }));
mock.module("@/lib/orpc/base", () => ({
  authorizedProcedure: os
    .$context<Pick<ORPCContext, "headers">>()
    .use(({ next }) => next({ context: { user: { id: "synthetic-user" } } })),
}));
mock.module("@/lib/i18n/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
mock.module("@/lib/organizations/workos-sync", () => ({
  deleteOrganizationFromWorkOS: () => Effect.void,
  removeMembershipFromWorkOS: () => Effect.void,
  updateMembershipRoleInWorkOS: () => Effect.void,
}));
mock.module("@/lib/billing/delete-autumn-customer", () => ({
  deleteAutumnCustomer: async () => {},
}));
mock.module("@/lib/sites/preview-revocation", () => ({
  revokeSitePreviewAccess: async () => {},
}));
mock.module("@/lib/upload/cleanup", () => ({
  deleteOrganizationChatFiles: async () => {},
  deleteOrganizationFiles: async () => {},
  deleteUserFiles: async () => {},
}));
mock.module("../../src/lib/orpc/routers/user-account", () => ({
  userAccountRouter: {},
  userSecurityRouter: {},
}));

const { userRouter } = await import("../../src/lib/orpc/routers/user");
const context = await createORPCContext({ headers: new Headers() });

beforeEach(() => {
  events.length = 0;
  teardown.mockClear();
  membership = { id: "membership", role: "owner" };
  membershipCount = 2;
  organizationExists = true;
  failTeardown = false;
});

test("normal deletion rejects nonmembers, nonowners and the last workspace before teardown", async () => {
  for (const scenario of ["nonmember", "nonowner", "last"]) {
    membership =
      scenario === "nonmember"
        ? null
        : {
            id: "membership",
            role: scenario === "nonowner" ? "admin" : "owner",
          };
    membershipCount = scenario === "last" ? 1 : 2;
    await expect(
      call(
        userRouter.membership.applyAction,
        { organizationId: "workspace", action: "delete" },
        { context }
      )
    ).rejects.toThrow();
    expect(teardown).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  }
});

test("deleteWithTransfers rejects missing ownership and nonexistent workspaces before teardown", async () => {
  membership = null;
  await expect(
    call(
      userRouter.deleteWithTransfers,
      { transfers: [{ orgId: "workspace", action: "delete" }] },
      { context }
    )
  ).rejects.toThrow("notOwner");
  expect(teardown).not.toHaveBeenCalled();
  membership = { id: "membership", role: "admin" };
  await expect(
    call(
      userRouter.deleteWithTransfers,
      { transfers: [{ orgId: "workspace", action: "delete" }] },
      { context }
    )
  ).rejects.toThrow("notOwner");
  expect(teardown).not.toHaveBeenCalled();
  membership = { id: "membership", role: "owner" };
  organizationExists = false;
  await expect(
    call(
      userRouter.deleteWithTransfers,
      { transfers: [{ orgId: "workspace", action: "delete" }] },
      { context }
    )
  ).rejects.toThrow("not found");
  expect(teardown).not.toHaveBeenCalled();
  expect(events).toEqual([]);
});

test.each(["normal", "transfers"])(
  "%s awaits teardown before organization cascade",
  async (route) => {
    if (route === "normal") {
      await call(
        userRouter.membership.applyAction,
        { organizationId: "workspace", action: "delete" },
        { context }
      );
    } else {
      await call(
        userRouter.deleteWithTransfers,
        { transfers: [{ orgId: "workspace", action: "delete" }] },
        { context }
      );
    }
    expect(events).toEqual(["teardown", "cascade"]);
    expect(teardown).toHaveBeenCalledTimes(1);
  }
);
test.each(["normal", "transfers"])(
  "%s propagates teardown failure without cascading",
  async (route) => {
    failTeardown = true;
    const result =
      route === "normal"
        ? call(
            userRouter.membership.applyAction,
            { organizationId: "workspace", action: "delete" },
            { context }
          )
        : call(
            userRouter.deleteWithTransfers,
            { transfers: [{ orgId: "workspace", action: "delete" }] },
            { context }
          );
    await expect(result).rejects.toThrow("Synthetic teardown failure");
    expect(events).toEqual(["teardown"]);
  }
);
