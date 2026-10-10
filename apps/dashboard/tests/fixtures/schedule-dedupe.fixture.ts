import { expect, mock, test } from "bun:test";

import { scheduleDedupeHashes } from "@notra/ai/utils/trigger-hash";
import { createScheduleRequestSchema } from "@notra/schemas/api/schedules";
import { call } from "@orpc/server";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import type { ORPCContext } from "../../src/types/orpc/context";

const findFirst = mock(
  async (_input: {
    where: SQL | undefined;
  }): Promise<{ id: string } | undefined> => undefined
);
mock.module("@notra/db/drizzle", () => ({
  db: { query: { contentTriggers: { findFirst } } },
}));
mock.module("@/lib/auth/organization", () => ({
  assertOrganizationAccess: async () => ({ user: { id: "user-a" } }),
  assertAuthenticated: mock(),
}));
mock.module("@/lib/billing/subscription", () => ({
  assertActiveSubscription: mock(),
}));
mock.module("@/lib/analytics/posthog-server", () => ({
  trackServerEvent: mock(),
}));
mock.module("@/lib/i18n/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
mock.module("@/lib/triggers/manual-run", () => ({
  ManualTriggerRunError: Error,
  triggerManualAutomationRun: mock(),
}));

const { automationRouter } =
  await import("../../src/lib/orpc/routers/automation");
const body = createScheduleRequestSchema.parse({
  name: "Weekly summary",
  sourceType: "cron",
  sourceConfig: {
    cron: { frequency: "weekly", hour: 9, minute: 0, dayOfWeek: 1 },
  },
  targets: { repositoryIds: ["repo-b", "repo-a"] },
  outputType: "changelog",
  outputConfig: {
    instructions: " A focused brief ",
    brandVoiceId: "voice-a",
    publishDestination: "custom",
  },
  enabled: false,
});
const context: ORPCContext = {
  headers: new Headers(),
  session: null,
  user: null,
  requestMemo: {
    authorizedOrganizationIds: new Set(),
    shelfMembersByOrganization: new Map(),
    analyticsEnabledByOrganization: new Map(),
    sitesEnabledByOrganization: new Map(),
    geoEntitlementByOrganization: new Map(),
    membershipByUserOrganization: new Map(),
  },
};

test.each([0, 1])(
  "both RPC writers find API hash candidate %i",
  async (candidate) => {
    const hashes = scheduleDedupeHashes(body);
    findFirst.mockImplementation(async ({ where }) => {
      if (!where) {
        throw new Error("Missing query scope");
      }
      const query = new PgDialect().sqlToQuery(where);
      expect(query.sql).toContain('"content_triggers"."dedupe_hash" in');
      expect(query.sql).toContain('"content_triggers"."organization_id" =');
      expect(query.params).toContain("org-a");
      expect(query.params).toContain(hashes[0]);
      expect(query.params).toContain(hashes[1]);
      return query.params.includes(hashes[candidate])
        ? { id: "other-row" }
        : undefined;
    });
    await expect(
      call(
        automationRouter.schedules.create,
        { ...body, organizationId: "org-a" },
        { context }
      )
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      call(
        automationRouter.schedules.update,
        { ...body, organizationId: "org-a", triggerId: "own-row" },
        { context }
      )
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const where = findFirst.mock.calls.at(-1)?.[0].where;
    if (!where) {
      throw new Error("Missing update query");
    }
    const query = new PgDialect().sqlToQuery(where);
    expect(query.sql).toContain('"content_triggers"."id" <>');
    expect(query.params).toContain("own-row");
  }
);

test("update excludes its own row from both hash candidates", async () => {
  findFirst.mockImplementation(async ({ where }) => {
    if (!where) {
      throw new Error("Missing query scope");
    }
    const query = new PgDialect().sqlToQuery(where);
    if (query.sql.includes('"content_triggers"."dedupe_hash" in')) {
      expect(query.sql).toContain('"content_triggers"."id" <>');
      expect(query.params).toContain("own-row");
      return undefined;
    }
    return undefined;
  });
  await expect(
    call(
      automationRouter.schedules.update,
      { ...body, organizationId: "org-a", triggerId: "own-row" },
      { context }
    )
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
