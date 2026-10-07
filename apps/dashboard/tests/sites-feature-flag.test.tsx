import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { call, ORPCError } from "@orpc/server";
import { renderToStaticMarkup } from "react-dom/server";

if (!process.env.NOTRA_SITES_FLAG_TEST_WORKER) {
  test.each(["main", "missing"])(
    "Sites feature flag contract (%s)",
    (mode) => {
      const result = spawnSync(
        process.execPath,
        ["test", fileURLToPath(import.meta.url)],
        {
          env: { ...process.env, NOTRA_SITES_FLAG_TEST_WORKER: mode },
          timeout: 30_000,
        }
      );
      expect(result.status, result.stderr?.toString()).toBe(0);
    },
    35_000
  );
} else if (process.env.NOTRA_SITES_FLAG_TEST_WORKER === "missing") {
  delete process.env.NEXT_PUBLIC_DATABUDDY_DASHBOARD_WEBSITE_ID;
  delete process.env.NOTRA_DEMO_MODE;
  process.env.NODE_ENV = "development";
  const { isSitesEnabledForOrganization } =
    await import("../src/lib/sites/flag");
  test("missing flag configuration remains disabled even in development", async () => {
    expect(await isSitesEnabledForOrganization("org-demo")).toBe(false);
  });
} else {
  process.env.NEXT_PUBLIC_DATABUDDY_DASHBOARD_WEBSITE_ID = "synthetic-client";
  delete process.env.WORKOS_API_KEY;
  let enabled = false;
  let reason = "TARGETING";
  let unavailable = false;
  let hanging = false;
  let member = true;
  let clientStatus = "ready";
  const evaluations: Array<{ key: string; organizationId: string }> = [];
  const nodeSdk = await import("@databuddy/sdk/node");
  mock.module("@databuddy/sdk/node", () => ({
    ...nodeSdk,
    createServerFlagsManager: () => ({
      getFlag: async (key: string, context: { organizationId: string }) => {
        evaluations.push({ key, organizationId: context.organizationId });
        if (hanging) {
          return new Promise(() => {});
        }
        if (unavailable) {
          throw new Error("Synthetic provider failure");
        }
        return { enabled, reason };
      },
    }),
  }));
  mock.module("@databuddy/sdk/react", () => ({
    useFlag: () => ({
      on: enabled,
      status: clientStatus,
      loading: clientStatus !== "ready",
    }),
  }));
  mock.module("../src/lib/auth/organization", () => ({
    assertAuthenticated: async () => ({
      session: {},
      user: { id: "user-demo" },
    }),
    assertOrganizationAccess: async () => {
      if (!member) {
        throw new ORPCError("FORBIDDEN", { message: "Not a member" });
      }
      return { membership: { role: "owner" }, user: { id: "user-demo" } };
    },
  }));
  const sitesEnv = await import("@notra/sites-server/env");
  mock.module("@notra/sites-server/env", () => ({
    ...sitesEnv,
    isSitesConfigured: () => true,
    getSitesHostingDomain: () => "hosting.example",
    getSitesHostingPortSuffix: () => "",
    siteCnameTarget: () => "cname.hosting.example",
  }));
  const { isSitesEnabledForOrganization } =
    await import("../src/lib/sites/flag");
  const { assertSitesAccess } = await import("../src/lib/sites/access");
  const { createORPCContext } = await import("../src/lib/orpc/context");
  const { sitesRouter } = await import("../src/lib/orpc/routers/sites");
  const { resolveNavItems } = await import("../src/utils/nav");
  const { commandRoutesForAI } =
    await import("../src/components/command-palette/registry");
  const { useNavVisibility } =
    await import("../src/lib/hooks/use-nav-visibility");
  beforeEach(() => {
    enabled = false;
    reason = "TARGETING";
    unavailable = false;
    hanging = false;
    member = true;
    clientStatus = "ready";
    evaluations.length = 0;
    delete process.env.NOTRA_DEMO_MODE;
    delete process.env.NEXT_PUBLIC_NOTRA_DEMO_MODE;
    process.env.NODE_ENV = "development";
  });

  test("server flag requires an explicit enabled result for the organization", async () => {
    expect(await isSitesEnabledForOrganization("org-one")).toBe(false);
    enabled = true;
    expect(await isSitesEnabledForOrganization("org-two")).toBe(true);
    expect(evaluations).toEqual([
      { key: "sites", organizationId: "org-one" },
      { key: "sites", organizationId: "org-two" },
    ]);
  });
  test("provider failures, error results and demo mode fail closed", async () => {
    enabled = true;
    reason = "ERROR";
    expect(await isSitesEnabledForOrganization("org-demo")).toBe(false);
    unavailable = true;
    expect(await isSitesEnabledForOrganization("org-demo")).toBe(false);
    process.env.NOTRA_DEMO_MODE = "true";
    const before = evaluations.length;
    expect(await isSitesEnabledForOrganization("org-demo")).toBe(false);
    expect(evaluations).toHaveLength(before);
  });
  test("membership is checked before flags and batched access shares one evaluation", async () => {
    const context = await createORPCContext({ headers: new Headers() });
    member = false;
    await expect(
      assertSitesAccess({
        headers: context.headers,
        organizationId: "org-demo",
      })
    ).rejects.toThrow("Not a member");
    expect(evaluations).toEqual([]);
    member = true;
    enabled = true;
    await Promise.all(
      [1, 2, 3].map(() =>
        assertSitesAccess({
          headers: context.headers,
          organizationId: "org-demo",
        })
      )
    );
    expect(evaluations).toHaveLength(1);
  });
  test("an unresponsive provider reaches a bounded disabled result", async () => {
    hanging = true;
    expect(await isSitesEnabledForOrganization("org-demo")).toBe(false);
  }, 7000);
  test("all representative Sites RPC entry points reject disabled organizations", async () => {
    const context = await createORPCContext({ headers: new Headers() });
    const client = { context };
    const org = { organizationId: "org-demo" };
    const site = { ...org, siteId: "site_demo" };
    await expect(call(sitesRouter.status, org, client)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(call(sitesRouter.list, org, client)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      call(sitesRouter.importableRepositories, org, client)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      call(
        sitesRouter.connectRepository,
        { ...org, githubRepositoryId: "demo-repo" },
        client
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(call(sitesRouter.get, site, client)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      call(
        sitesRouter.create,
        {
          ...org,
          name: "Demo",
          repositoryId: "repo_demo",
          mounts: { blog: "/blog" },
        },
        client
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      call(
        sitesRouter.editor.saveDraft,
        {
          ...site,
          path: "blog/demo.md",
          content: "Demo",
          baseBlobSha: null,
          baseCommitSha: null,
        },
        client
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      call(
        sitesRouter.previews.setPassword,
        { ...site, password: "synthetic-password" },
        client
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(evaluations).toHaveLength(1);
  });
  test("enabled Sites RPC requests preserve their existing status response", async () => {
    enabled = true;
    const context = await createORPCContext({ headers: new Headers() });
    expect(
      await call(
        sitesRouter.status,
        { organizationId: "org-demo" },
        { context }
      )
    ).toEqual({ configured: true, hostingDomain: "hosting.example" });
  });
  test("navigation and AI discovery expose Sites only when enabled", () => {
    const off = { iris: true, analytics: true, sites: false };
    const on = { ...off, sites: true };
    expect(resolveNavItems(["/sites"], off)).toEqual([]);
    expect(resolveNavItems(["/sites"], on)).toHaveLength(1);
    expect(resolveNavItems(["/sites"])).toEqual([]);
    expect(
      commandRoutesForAI("demo", true, off).some(
        (route) => route.id === "sites"
      )
    ).toBe(false);
    expect(
      commandRoutesForAI("demo", true, on).some((route) => route.id === "sites")
    ).toBe(true);
  });
  test("client visibility has no development bypass and rejects loading/errors/demo", () => {
    function Visibility() {
      return <span>{String(useNavVisibility().sites)}</span>;
    }
    expect(renderToStaticMarkup(<Visibility />)).toContain("false");
    enabled = true;
    expect(renderToStaticMarkup(<Visibility />)).toContain("true");
    clientStatus = "error";
    expect(renderToStaticMarkup(<Visibility />)).toContain("false");
    clientStatus = "loading";
    expect(renderToStaticMarkup(<Visibility />)).toContain("false");
    clientStatus = "ready";
    process.env.NEXT_PUBLIC_NOTRA_DEMO_MODE = "true";
    expect(renderToStaticMarkup(<Visibility />)).toContain("false");
  });
}
