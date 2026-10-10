import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { call } from "@orpc/server";

if (process.env.NOTRA_ATTACHMENT_TELEMETRY_TEST !== "1") {
  test("attachment handlers retain only membership-verified tenant attribution", () => {
    const child = spawnSync(
      process.execPath,
      ["--no-env-file", "test", fileURLToPath(import.meta.url)],
      {
        env: {
          PATH: process.env.PATH,
          NOTRA_ATTACHMENT_TELEMETRY_TEST: "1",
          DATABASE_URL: "",
          NEXT_PUBLIC_DEMO_MODE: "false",
        },
        timeout: 20_000,
      }
    );
    expect(child.status, child.stderr?.toString()).toBe(0);
  }, 25_000);
} else {
  const access = { allowed: false };
  const select = mock(() => {
    throw new Error("fixture failure after membership");
  });
  mock.module("@notra/db/drizzle", () => ({
    db: {
      query: {
        members: {
          findFirst: async () =>
            access.allowed ? { id: "member_fixture" } : undefined,
        },
      },
      select,
    },
  }));
  mock.module("@/lib/auth/organization", () => ({
    assertAuthenticated: async () => ({
      session: {},
      user: { id: "user_fixture" },
    }),
  }));
  const { attachmentsRouter } = await import("./attachments");
  const { createORPCContext } = await import("../context");
  const { rpcRequestOrganizationId } = await import("@/utils/rpc-telemetry");
  for (const name of ["list", "deleteMany"] as const) {
    test(`${name} records successful membership before later errors, never denied or ambiguous tenants`, async () => {
      const context = await createORPCContext({ headers: new Headers() });
      let organizationId = "org_target";
      const invoke = () =>
        name === "list"
          ? call(attachmentsRouter.list, { organizationId }, { context })
          : call(
              attachmentsRouter.deleteMany,
              { organizationId, keys: ["fixture-key"] },
              { context }
            );
      access.allowed = false;
      select.mockClear();
      await expect(invoke()).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(select).not.toHaveBeenCalled();
      expect(rpcRequestOrganizationId(context.requestMemo)).toBeUndefined();
      access.allowed = true;
      await expect(invoke()).rejects.toThrow(
        "fixture failure after membership"
      );
      expect(rpcRequestOrganizationId(context.requestMemo)).toBe("org_target");
      expect(context.requestMemo.authenticatedUserId).toBe("user_fixture");
      organizationId = "org_other";
      await expect(invoke()).rejects.toThrow(
        "fixture failure after membership"
      );
      expect(rpcRequestOrganizationId(context.requestMemo)).toBeUndefined();
    });
  }
}
