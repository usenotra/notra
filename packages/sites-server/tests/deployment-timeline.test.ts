import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { SITE_DEPLOYMENT_PHASES } from "@notra/sites-core/constants/deployment-timeline";
import {
  SITE_BUILD_LIMITS,
  SITE_R2_KEYS,
} from "@notra/sites-core/constants/sites";

import type {
  SandboxBuildParams,
  SandboxBuildResult,
} from "../src/types/build";
import type {
  DeploymentTransitionValues,
  SiteDeployment,
  SiteDeploymentStatus,
} from "../src/types/deployments";
import type { Site } from "../src/types/sites";

if (process.env.NOTRA_SITES_TIMELINE_TEST_WORKER !== "1") {
  test("deployment phase logs with isolated pipeline mocks", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_SITES_TIMELINE_TEST_WORKER: "1" },
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const site = { id: "site", status: "active", rootDirectory: "" } as Site;
  let deployment: SiteDeployment;
  let writes: string[] = [];
  let transitions: SiteDeploymentStatus[] = [];
  let rejectTransition: SiteDeploymentStatus | null = null;
  let telemetryFails = false;
  let published = false;
  let activated = false;
  let build: SandboxBuildResult;
  const tail = "x".repeat(SITE_BUILD_LIMITS.maxBuildLogBytes);

  mock.module("../src/r2", () => ({
    r2Put: (key: string, log: string) => {
      expect(key).toBe(SITE_R2_KEYS.buildLog(site.id, deployment.id));
      writes.push(log);
      return telemetryFails
        ? Promise.reject(new Error("telemetry unavailable"))
        : Promise.resolve();
    },
  }));
  mock.module("../src/deployments", () => ({
    getDeployment: async () => deployment,
    hasNewerDeployment: async () => false,
    transitionDeployment: async (
      _id: string,
      status: SiteDeploymentStatus,
      values?: DeploymentTransitionValues
    ) => {
      transitions.push(status);
      if (status === rejectTransition) {
        deployment.status = "canceled";
        return false;
      }
      Object.assign(deployment, values, { status });
      return true;
    },
  }));
  mock.module("../src/github", () => ({
    siteRepositoryAccess: async () => ({ repository: "owner/repo", token: "" }),
    getBranchHead: async () => ({ sha: "sha" }),
    downloadRepositoryTarball: async () => {
      expect(deployment.status).toBe("building");
      expect(writes).toHaveLength(1);
      expect(writes[0]).toStartWith("[deployment:preparing] ");
      expect(
        Date.parse(writes[0]?.split(" ")[1]?.trim() ?? "")
      ).toBeGreaterThanOrEqual(deployment.startedAt?.getTime() ?? 0);
      return new Uint8Array();
    },
  }));
  mock.module("../src/box-build", () => ({
    runSandboxBuild: async ({ onLog }: SandboxBuildParams) => {
      expect(writes).toHaveLength(2);
      expect(writes[1]).toStartWith(writes[0] ?? "");
      expect(writes[1]).toContain("[deployment:building] ");
      expect(writes[1]?.trim().split("\n")).toHaveLength(2);
      await onLog?.("first sandbox log");
      await onLog?.(tail);
      return build;
    },
  }));
  mock.module("../src/publish", () => ({
    publishDeploymentFiles: async () => {
      expect(deployment.status).toBe("uploading");
      expect(writes.at(-1)).toContain("[deployment:deploying] ");
      expect(writes.at(-1)).toEndWith(build.log);
      published = true;
      return { files: [], totalBytes: 0 };
    },
  }));
  mock.module("../src/activation", () => ({
    activateDeployment: async () => {
      activated = true;
      return "live";
    },
  }));
  mock.module("../src/reporting", () => ({
    openCheckRun: async (_site: Site, queued: SiteDeployment) => queued,
    reportOutcome: async () => {},
  }));
  const { runDeploymentPipeline } = await import("../src/pipeline");

  beforeEach(() => {
    deployment = {
      id: "deployment",
      status: "queued",
      startedAt: null,
      trigger: "manual",
      branch: "main",
      commitSha: "sha",
      kind: "production",
      target: {
        publicOrigin: "https://example.com",
        mounts: {},
        noindex: false,
      },
    } as SiteDeployment;
    writes = [];
    transitions = [];
    rejectTransition = null;
    telemetryFails = false;
    published = false;
    activated = false;
    build = {
      result: {
        ok: true,
        diagnostics: [],
        areas: [],
        fileCount: 0,
        totalBytes: 0,
        redirects: [],
        contentSecurityPolicy: null,
      },
      outputArchive: new Uint8Array(),
      log: "final sandbox log",
      crash: null,
      durationMs: 10,
      toolchainVersion: "test",
    };
  });

  test("real phase boundaries preserve markers and the newest bounded sandbox log", async () => {
    expect(await runDeploymentPipeline(site, deployment)).toEqual({
      kind: "live",
    });
    expect(SITE_DEPLOYMENT_PHASES).toEqual([
      "preparing",
      "building",
      "deploying",
    ]);
    expect(transitions).toEqual(["building", "uploading", "ready"]);
    expect(writes).toHaveLength(6);
    const preparing = `[deployment:preparing] ${deployment.startedAt?.toISOString()}\n`;
    for (const log of writes) {
      expect(log).toStartWith(preparing);
    }
    for (const log of writes.slice(1)) {
      expect(log).toContain("[deployment:building] ");
    }
    expect(writes[2]).toEndWith("first sandbox log");
    expect(writes[3]).toEndWith(tail);
    expect(writes[4]).toEndWith(build.log);
    expect(writes[4]).not.toContain("[deployment:deploying] ");
    const markers = writes.at(-1)?.split("\n").slice(0, 3) ?? [];
    const timestamps = markers.map((line, index) => {
      const prefix = `[deployment:${SITE_DEPLOYMENT_PHASES[index]}] `;
      expect(line).toStartWith(prefix);
      const timestamp = line.slice(prefix.length);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
      return Date.parse(timestamp);
    });
    expect(timestamps[0]).toBe(deployment.startedAt?.getTime());
    expect(timestamps[1]).toBeGreaterThanOrEqual(timestamps[0] ?? 0);
    expect(timestamps[2]).toBeGreaterThanOrEqual(timestamps[1] ?? 0);
    expect(deployment.finishedAt?.getTime()).toBeGreaterThanOrEqual(
      timestamps[2] ?? 0
    );
    expect(published).toBe(true);
    expect(activated).toBe(true);
  });

  test.each(["building", "uploading"] as const)(
    "preparing records the current %s retry without resetting DB startedAt",
    async (status) => {
      const originalStart = new Date("2026-01-01T00:00:00.000Z");
      deployment.startedAt = originalStart;
      deployment.status = status;
      const retryEntry = Date.now();
      await runDeploymentPipeline(site, deployment);
      const preparingTimestamp = Date.parse(
        writes[0]?.split(" ")[1]?.trim() ?? ""
      );
      expect(preparingTimestamp).toBeGreaterThanOrEqual(retryEntry);
      expect(preparingTimestamp).toBeGreaterThan(originalStart.getTime());
      expect(deployment.startedAt).toBe(originalStart);
    }
  );

  test("failed builds never record deploying", async () => {
    build.result = null;
    build.outputArchive = null;
    build.crash = "build failed";
    expect((await runDeploymentPipeline(site, deployment)).kind).toBe("failed");
    expect(transitions).toEqual(["building", "failed"]);
    expect(writes).toHaveLength(5);
    expect(writes.join("\n")).not.toContain("[deployment:deploying]");
    expect(published).toBe(false);
    expect(activated).toBe(false);
  });

  test("a canceled uploading guard never records deploying or publishes", async () => {
    rejectTransition = "uploading";
    expect((await runDeploymentPipeline(site, deployment)).kind).toBe(
      "skipped"
    );
    expect(writes).toHaveLength(5);
    expect(writes.join("\n")).not.toContain("[deployment:deploying]");
    expect(published).toBe(false);
  });

  test("a canceled building guard writes no phase log", async () => {
    rejectTransition = "building";
    expect((await runDeploymentPipeline(site, deployment)).kind).toBe(
      "skipped"
    );
    expect(writes).toEqual([]);
    expect(published).toBe(false);
  });

  test("telemetry failures do not change a successful deployment outcome", async () => {
    telemetryFails = true;
    expect(await runDeploymentPipeline(site, deployment)).toEqual({
      kind: "live",
    });
    expect(writes).toHaveLength(6);
    expect(deployment.status).toBe("ready");
    expect(published).toBe(true);
    expect(activated).toBe(true);
  });

  test("resuming a ready deployment activates without manufacturing phase logs", async () => {
    deployment.status = "ready";
    expect(await runDeploymentPipeline(site, deployment)).toEqual({
      kind: "live",
    });
    expect(writes).toEqual([]);
    expect(transitions).toEqual([]);
    expect(published).toBe(false);
    expect(activated).toBe(true);
  });
}
