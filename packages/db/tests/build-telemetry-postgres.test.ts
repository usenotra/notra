import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";
import type { SiteBuildMetrics } from "@notra/sites-core/types/build-metrics";

const databaseUrl = process.env.SITES_TEST_DATABASE_URL;
if (!databaseUrl) {
  test.skip("build telemetry persistence requires SITES_TEST_DATABASE_URL", () => {});
} else if (process.env.NOTRA_BUILD_TELEMETRY_TEST_WORKER !== "1") {
  test("build telemetry persists independently of artifacts and cascades on PostgreSQL", () => {
    const url = new URL(databaseUrl);
    expect(url.hostname).toBe("127.0.0.1");
    expect(url.port).toBe("55447");
    expect(url.pathname).toBe("/notra_server_audit");
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_BUILD_TELEMETRY_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  test("upsert, artifact cleanup, missing row and deployment/site/organization cascades", async () => {
    const url = new URL(databaseUrl);
    expect(url.hostname).toBe("127.0.0.1");
    expect(url.port).toBe("55447");
    expect(url.pathname).toBe("/notra_server_audit");
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const schema = await import("@notra/db/schema");
    const scope = `build_telemetry_${crypto.randomUUID().replaceAll("-", "")}`;
    const pool = new Pool({
      connectionString: databaseUrl,
      options: `-c search_path=${scope}`,
    });
    const db = drizzle(pool, { schema });
    const metrics: SiteBuildMetrics = {
      version: 1,
      provider: "upstash",
      snapshotId: "snapshot",
      sandboxId: "sandbox",
      requestedSize: "medium",
      sourceArchiveBytes: 1024,
      outputArchiveBytes: 2048,
      totalDurationMs: 100,
      phases: { execution: 80 },
    };
    const artifacts = new Set(["deployments/site-a/deployment-a/"]);
    mock.module("@notra/db/drizzle", () => ({ db }));
    mock.module("../../sites-server/src/activation", () => ({
      readLiveDeployments: async () => ({ ids: new Set(), previews: {} }),
    }));
    mock.module("../../sites-server/src/r2", () => ({
      r2ListPrefixes: async () => [...artifacts],
      r2DeletePrefix: async (prefix: string) => artifacts.delete(prefix),
    }));
    const { saveBuildTelemetry, getBuildTelemetry } =
      await import("../../sites-server/src/build-telemetry");
    const { cleanupSiteDeployments } =
      await import("../../sites-server/src/cleanup");
    try {
      await pool.query(`CREATE SCHEMA "${scope}"`);
      for (const path of [
        "fixtures/sites-tenant-integrity.sql",
        "../migrations/0112_sites.sql",
        "fixtures/sites-tenant-integrity-seed.sql",
      ]) {
        await pool.query(
          readFileSync(new URL(path, import.meta.url), "utf8").replaceAll(
            '"public".',
            `"${scope}".`
          )
        );
      }
      expect(await getBuildTelemetry("missing")).toBeNull();
      await saveBuildTelemetry("deployment-a", metrics, "first log");
      const first = await getBuildTelemetry("deployment-a");
      expect(first?.metrics).toEqual(metrics);
      expect(first?.log).toBe("first log");
      expect(first?.createdAt).toBeInstanceOf(Date);
      await pool.query("SELECT pg_sleep(0.01)");
      const updatedMetrics = { ...metrics, totalDurationMs: 200 };
      const header = "[deployment:building] 2026-10-08T10:00:00.000Z\n";
      await saveBuildTelemetry(
        "deployment-a",
        updatedMetrics,
        header + "😀".repeat(SITE_BUILD_LIMITS.maxBuildLogBytes)
      );
      const retried = await getBuildTelemetry("deployment-a");
      expect(retried?.createdAt).toEqual(first?.createdAt);
      expect(retried?.updatedAt.getTime()).toBeGreaterThan(
        first?.updatedAt.getTime() ?? 0
      );
      expect(retried?.metrics).toEqual(updatedMetrics);
      expect(retried?.log).toStartWith(header);
      expect(Buffer.byteLength(retried?.log ?? "")).toBeLessThanOrEqual(
        SITE_BUILD_LIMITS.maxBuildLogBytes
      );
      expect(
        (await pool.query("SELECT count(*) FROM site_build_telemetry")).rows[0]
          .count
      ).toBe("1");
      await pool.query(
        "UPDATE site_deployments SET kind='preview', preview_key='pr-1', status='ready', finished_at=now() - interval '7 days' WHERE id='deployment-a'"
      );
      expect(await cleanupSiteDeployments("site-a")).toEqual({
        deleted: ["deployment-a"],
      });
      expect(artifacts.size).toBe(0);
      expect(
        (
          await pool.query(
            "SELECT status FROM site_deployments WHERE id='deployment-a'"
          )
        ).rows[0].status
      ).toBe("expired");
      expect(await getBuildTelemetry("deployment-a")).toEqual(retried);
      await expect(
        saveBuildTelemetry("missing", metrics, "log")
      ).rejects.toThrow();
      await saveBuildTelemetry("deployment-b", metrics, "site cascade");
      await saveBuildTelemetry("deployment-a2", metrics, "org cascade");
      await pool.query("DELETE FROM site_deployments WHERE id='deployment-a'");
      expect(await getBuildTelemetry("deployment-a")).toBeNull();
      await pool.query("DELETE FROM sites WHERE id='site-b'");
      expect(await getBuildTelemetry("deployment-b")).toBeNull();
      await pool.query("DELETE FROM organizations WHERE id='a'");
      expect(await getBuildTelemetry("deployment-a2")).toBeNull();
    } finally {
      await pool.query(`DROP SCHEMA IF EXISTS "${scope}" CASCADE`);
      await pool.end();
    }
  });
}
