import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test.each([
  "deleted organization",
  "unmapped organization",
  "missing local organization",
  "existing membership",
  "external id fallback",
  "missing membership",
  "deleted user",
  "unauthorized WorkOS user request",
  "rate limited WorkOS user request",
  "WorkOS user server failure",
  "WorkOS user network failure",
  "unauthorized WorkOS request",
  "rate limited WorkOS request",
  "WorkOS server failure",
  "WorkOS network failure",
  "local lookup failure",
  "external id lookup failure",
  "external id lookup 404 failure",
  "external user lookup 404 failure",
  "membership deletion failure",
])("membership deletion webhook: %s", (scenario) => {
  const script = `
    import { mock } from "bun:test";
    import assert from "node:assert/strict";
    import { createHmac } from "node:crypto";
    import { PgDialect } from "drizzle-orm/pg-core";
    import { members } from "@notra/db/schema";
    import { NotFoundException, WorkOS } from "@workos-inc/node";

    const scenario = ${JSON.stringify(scenario)};
    const externalFallback = scenario === "external id fallback";
    const missingOrganization = externalFallback || [
      "deleted organization", "unmapped organization", "missing local organization", "unauthorized WorkOS request",
      "rate limited WorkOS request", "WorkOS server failure", "WorkOS network failure",
      "external id lookup failure", "external id lookup 404 failure",
    ].includes(scenario);
    const userFailure = [
      "unauthorized WorkOS user request", "rate limited WorkOS user request",
      "WorkOS user server failure", "WorkOS user network failure",
    ].includes(scenario);
    const missingUser = externalFallback || userFailure || [
      "deleted user", "deleted organization", "unmapped organization", "missing local organization", "external user lookup 404 failure",
    ].includes(scenario);
    const providerCalls = [];
    const deletes = [];
    const dialect = new PgDialect();
    const initialMembers = scenario === "missing membership" ? [] : [
      { organizationId: "local_org", userId: "local_user" },
      { organizationId: "local_other_org", userId: "local_user" },
      { organizationId: "local_org", userId: "local_other_user" },
    ];
    let remainingMembers = [...initialMembers];
    const databaseError = new Error("Fixture database failure");
    const db = {
      query: {
        organizations: {
          findFirst: async ({ where }) => {
            const query = dialect.sqlToQuery(where);
            if (scenario === "external id lookup 404 failure" && query.params[0] === "local_org") {
              throw new NotFoundException({ message: "Fixture lookup failure", path: "/fixture", requestID: "fixture" });
            }
            if (scenario === "local lookup failure" || (scenario === "external id lookup failure" && query.params[0] === "local_org")) {
              throw databaseError;
            }
            return query.params[0] === "local_org" || !missingOrganization ? { id: "local_org" } : undefined;
          },
        },
        users: {
          findFirst: async ({ where }) => {
            const query = dialect.sqlToQuery(where);
            if (scenario === "external user lookup 404 failure" && query.params[0] === "local_user") {
              throw new NotFoundException({ message: "Fixture user lookup failure", path: "/fixture", requestID: "fixture" });
            }
            return query.params[0] === "local_user" || !missingUser ? { id: "local_user" } : undefined;
          },
        },
      },
      delete: (table) => {
        assert.equal(table, members);
        return {
          where: async (where) => {
            if (scenario === "membership deletion failure") throw databaseError;
            const query = dialect.sqlToQuery(where);
            assert.equal(query.sql, '("members"."user_id" = $1 and "members"."organization_id" = $2)');
            assert.deepEqual(query.params, ["local_user", "local_org"]);
            deletes.push(query);
            remainingMembers = remainingMembers.filter(row => row.userId !== query.params[0] || row.organizationId !== query.params[1]);
          },
        };
      },
    };
    mock.module("@notra/db/drizzle", () => ({ db }));
    mock.module("@/lib/auth/membership-upsert", () => ({
      upsertMembership: () => { throw new Error("Deletion must not upsert records"); },
    }));
    globalThis.fetch = async (url, options) => {
      const path = new URL(url).pathname;
      assert.equal(options.method, "GET");
      providerCalls.push(path);
      if (path === "/organizations/org_fixture") {
        if (scenario === "WorkOS network failure") throw new Error("Fixture network failure");
        const status = {
          "deleted organization": 404,
          "unauthorized WorkOS request": 401,
          "rate limited WorkOS request": 429,
          "WorkOS server failure": 503,
        }[scenario];
        if (status) return Response.json({ message: "Fixture WorkOS failure" }, { status });
        return Response.json({
          object: "organization", id: "org_fixture", name: "Fixture organization",
          external_id: scenario === "unmapped organization" ? null : scenario === "missing local organization" ? "absent_org" : "local_org",
          domains: [], metadata: {}, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
        });
      }
      assert.equal(path, "/user_management/users/user_fixture");
      if (scenario === "WorkOS user network failure") throw new Error("Fixture user network failure");
      const status = {
        "deleted user": 404,
        "unauthorized WorkOS user request": 401,
        "rate limited WorkOS user request": 429,
        "WorkOS user server failure": 503,
      }[scenario];
      if (status) return Response.json({ message: "Fixture WorkOS user failure" }, { status });
      assert.ok(externalFallback || scenario === "external user lookup 404 failure", "An unmapped organization must not trigger user resolution");
      return Response.json({
        object: "user", id: "user_fixture", external_id: "local_user", email: "fixture@example.test",
        email_verified: true, first_name: null, last_name: null, profile_picture_url: null,
        created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
      });
    };
    const workos = new WorkOS({ apiKey: "sk_test_fixture_only", apiHostname: "fixture.invalid", maxRetries: 0 });
    mock.module("@workos/authkit-session", () => ({ getWorkOS: () => workos }));
    if (scenario === "deleted organization") {
      await assert.rejects(workos.organizations.getOrganization("org_fixture"), NotFoundException);
      providerCalls.length = 0;
    }
    if (scenario === "deleted user") {
      await assert.rejects(workos.userManagement.getUser("user_fixture"), NotFoundException);
      providerCalls.length = 0;
    }
    const { POST } = await import("./src/app/api/webhooks/workos/route.ts");
    const payload = JSON.stringify({
      id: "event_fixture", event: "organization_membership.deleted", created_at: "2026-01-01T00:00:00.000Z",
      data: {
        object: "organization_membership", id: "om_fixture", organization_id: "org_fixture", user_id: "user_fixture",
        status: "inactive", role: { slug: "member" }, roles: [{ slug: "member" }],
        created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
      },
    });
    const timestamp = Date.now();
    const signature = createHmac("sha256", process.env.WORKOS_WEBHOOK_SECRET).update(timestamp + "." + payload).digest("hex");
    const deliver = () => POST(new Request("http://localhost/api/webhooks/workos", {
      method: "POST", body: payload, headers: { "workos-signature": "t=" + timestamp + ",v1=" + signature },
    }));
    const failure = userFailure || [
      "unauthorized WorkOS request", "rate limited WorkOS request", "WorkOS server failure", "WorkOS network failure",
      "local lookup failure", "external id lookup failure", "external id lookup 404 failure", "external user lookup 404 failure", "membership deletion failure",
    ].includes(scenario);
    const response = await deliver();
    assert.equal(response.status, failure ? 500 : 200);
    assert.deepEqual(await response.json(), failure ? { error: "sync_failed" } : { received: true });
    if (failure) {
      assert.equal(deletes.length, 0);
      assert.deepEqual(remainingMembers, initialMembers);
      if (userFailure) assert.deepEqual(providerCalls, ["/user_management/users/user_fixture"]);
    } else {
      assert.equal((await deliver()).status, 200);
      if (["deleted organization", "unmapped organization", "missing local organization", "deleted user"].includes(scenario)) {
        assert.equal(deletes.length, 0);
        assert.deepEqual(remainingMembers, initialMembers);
        const path = scenario === "deleted user" ? "/user_management/users/user_fixture" : "/organizations/org_fixture";
        assert.deepEqual(providerCalls, [path, path]);
      } else {
        assert.equal(deletes.length, 2);
        assert.deepEqual(remainingMembers, initialMembers.filter(row => row.userId !== "local_user" || row.organizationId !== "local_org"));
        assert.deepEqual(providerCalls, externalFallback ? [
          "/organizations/org_fixture", "/user_management/users/user_fixture",
          "/organizations/org_fixture", "/user_management/users/user_fixture",
        ] : []);
      }
    }
  `;
  const child = spawnSync(process.execPath, ["--eval", script], {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)),
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "test",
      WORKOS_WEBHOOK_SECRET: "local-webhook-fixture-secret",
    },
    encoding: "utf8",
    timeout: 3000,
  });
  expect(child.stderr).toBe("");
  expect(child.status).toBe(0);
});
