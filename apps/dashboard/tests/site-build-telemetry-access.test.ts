import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { SiteBuildMetrics } from "@notra/sites-core/types/build-metrics";
import type { SiteDeployment } from "@notra/sites-server/types/deployments";
import type { Site } from "@notra/sites-server/types/sites";
import { call } from "@orpc/server";
import { Effect } from "effect";

if (process.env.NOTRA_BUILD_TELEMETRY_ACCESS_WORKER !== "1") {
  test("deployment telemetry preserves authorization and durable log fallback", () => {
    const child = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          ...process.env,
          NOTRA_BUILD_TELEMETRY_ACCESS_WORKER: "1",
          DATABASE_URL: "",
          NEXT_PUBLIC_DEMO_MODE: "false",
        },
        timeout: 30_000,
      }
    );
    expect(child.status, child.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  const site = { id: "site_telemetry", organizationId: "org" } as Site;
  let deployment: SiteDeployment;
  let r2Fails = false;
  let durable = true;
  const metrics: SiteBuildMetrics = {
    version: 1,
    provider: "upstash",
    snapshotId: "snapshot",
    sandboxId: "sandbox",
    requestedSize: "medium",
    sourceArchiveBytes: 3,
    outputArchiveBytes: 1,
    totalDurationMs: 10,
    phases: { compile: 3 },
  };
  const readTelemetry = mock(async () =>
    durable ? { log: "durable final log", metrics } : null
  );
  mock.module("@notra/sites-server/build-telemetry", () => ({
    getBuildTelemetry: readTelemetry,
    getBuildTelemetryEffect: () =>
      Effect.tryPromise({ try: readTelemetry, catch: (error) => error }),
    saveBuildTelemetry: async () => {
      throw new Error("GET attempted a telemetry write");
    },
    saveBuildTelemetryEffect: () =>
      Effect.die(new Error("GET attempted a telemetry write")),
  }));
  const deployments = await import("@notra/sites-server/deployments");
  mock.module("@notra/sites-server/deployments", () => ({
    ...deployments,
    getSite: async () => site,
    getDeployment: async () => deployment,
  }));
  const r2 = await import("@notra/sites-server/r2");
  mock.module("@notra/sites-server/r2", () => ({
    ...r2,
    r2GetText: async () => {
      if (r2Fails) {
        throw new Error("R2 unavailable");
      }
      return { text: "live R2 log", etag: "etag" };
    },
  }));
  const state = await import("@notra/sites-server/state");
  mock.module("@notra/sites-server/state", () => ({
    ...state,
    readServingState: async () => null,
  }));
  const env = await import("@notra/sites-server/env");
  mock.module("@notra/sites-server/env", () => ({
    ...env,
    isSitesConfigured: () => true,
  }));
  mock.module("../src/lib/auth/organization", () => ({
    assertAuthenticated: async () => ({ session: {}, user: { id: "user" } }),
    assertOrganizationAccess: async () => ({
      membership: { role: "member" },
      user: { id: "user" },
    }),
  }));
  mock.module("../src/lib/sites/access", () => ({
    assertSitesAccess: async () => {},
  }));
  const { sitesRouter } = await import("../src/lib/orpc/routers/sites");
  const { createORPCContext } = await import("../src/lib/orpc/context");
  const read = async (organizationId = "org") =>
    call(
      sitesRouter.deployments.get,
      {
        organizationId,
        siteId: "site_telemetry",
        deploymentId: "dep_telemetry",
      },
      { context: await createORPCContext({ headers: new Headers() }) }
    );
  beforeEach(() => {
    readTelemetry.mockClear();
    r2Fails = false;
    durable = true;
    deployment = {
      id: "dep_telemetry",
      siteId: "site_telemetry",
      status: "ready",
      kind: "production",
      previewKey: null,
      target: {
        publicOrigin: "https://example.test",
        mounts: {},
        noindex: false,
      },
    } as SiteDeployment;
  });
  test("terminal deployments use durable log and expose metrics", async () => {
    const result = await read();
    expect(result.log).toBe("durable final log");
    expect(result.metrics).toEqual(metrics);
  });
  test("running deployments retain live logs", async () => {
    deployment.status = "building";
    expect((await read()).log).toBe("live R2 log");
  });
  test("durable logs remain readable when the R2 log read fails", async () => {
    r2Fails = true;
    expect((await read()).log).toBe("durable final log");
  });
  test("older deployments without telemetry still return R2 logs", async () => {
    durable = false;
    const result = await read();
    expect(result.log).toBe("live R2 log");
    expect(result.metrics).toBeNull();
  });
  test("another organization's site is rejected before telemetry is read", async () => {
    await expect(read("other-org")).rejects.toThrow("Site not found");
    expect(readTelemetry).not.toHaveBeenCalled();
  });
  test("another site's deployment is rejected before telemetry is read", async () => {
    deployment.siteId = "site_other";
    await expect(read()).rejects.toThrow("Deployment not found");
    expect(readTelemetry).not.toHaveBeenCalled();
  });
}
