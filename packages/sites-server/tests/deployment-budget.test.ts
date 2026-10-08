import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import {
  organizations,
  siteDeployments,
  siteJobs,
  sites,
} from "@notra/db/schema";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import type { SiteDeployment } from "../src/types/deployments";
import type { Site } from "../src/types/sites";

if (process.env.NOTRA_SITES_BUDGET_TEST_WORKER !== "1") {
  test("organization deployment budgets in an isolated in-memory transaction adapter", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_SITES_BUDGET_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const dialect = new PgDialect();
  const rows = new Map(
    Array.from({ length: 20 }, (_, index) => {
      const site = {
        id: `site-${index}`,
        organizationId: "organization",
        status: "active",
        lastGeneration: 0,
        previewsEnabled: true,
        name: "Synthetic",
        publicOrigin: "https://synthetic.example",
        mounts: { blog: "/blog" },
        showBranding: true,
      } as Site;
      return [site.id, site] as const;
    })
  );
  const deployments: SiteDeployment[] = [];
  const locks = new Map<string, Promise<void>>();
  const observed: number[] = [];
  let count = 299;
  let jobs = 0;

  mock.module("@notra/db/drizzle", () => ({
    db: {
      transaction: async <T>(run: (tx: unknown) => Promise<T>) => {
        const releases: Array<() => void> = [];
        const held = new Set<string>();
        const lock = async (key: string) => {
          if (held.has(key)) {
            return;
          }
          const previous = locks.get(key);
          let release = () => {};
          const current = new Promise<void>((resolve) => {
            release = resolve;
          });
          locks.set(key, current);
          await previous;
          held.add(key);
          releases.push(release);
        };
        const tx = {
          execute: async (condition: SQL) => {
            const query = dialect.sqlToQuery(condition);
            expect(query.sql).toContain("pg_advisory_xact_lock");
            expect(query.params[0]).toBe(
              "sites-deployment-budget:organization"
            );
            await lock(String(query.params[0]));
          },
          update: (table: unknown) => ({
            set: () => ({
              where: (condition: SQL) => ({
                returning: async () => {
                  expect(table).toBe(sites);
                  const id = String(dialect.sqlToQuery(condition).params[0]);
                  await lock(`site:${id}`);
                  const site = rows.get(id);
                  if (!site) {
                    return [];
                  }
                  site.lastGeneration += 1;
                  return [{ ...site }];
                },
              }),
            }),
          }),
          select: () => ({
            from: (table: unknown) => ({
              where: (condition: SQL) => {
                const params = dialect.sqlToQuery(condition).params;
                if (table === sites) {
                  return Promise.resolve(
                    rows.get(String(params[0]))
                      ? [rows.get(String(params[0]))]
                      : []
                  );
                }
                if (table === organizations) {
                  return {
                    for: async (mode: string) => {
                      expect(mode).toBe("key share");
                      expect(params[0]).toBe("organization");
                      return [{ id: "organization" }];
                    },
                  };
                }
                expect(table).toBe(siteDeployments);
                expect(params[0]).toBe("organization");
                const snapshot = count;
                observed.push(snapshot);
                return delay(5).then(() => [{ count: snapshot }]);
              },
            }),
          }),
          insert: (table: unknown) => ({
            values: (values: SiteDeployment) => {
              if (table === siteJobs) {
                jobs += 1;
                return Promise.resolve();
              }
              expect(table).toBe(siteDeployments);
              deployments.push(values);
              count += 1;
              return { returning: async () => [values] };
            },
          }),
        };
        try {
          return await run(tx);
        } finally {
          for (const release of releases) {
            release();
          }
        }
      },
    },
  }));
  const { enqueueSiteDeployment } = await import("../src/deployments");

  test("different-site transactions share the organization budget and accept only its last slot", async () => {
    const results = await Promise.allSettled(
      [...rows.keys()].map((siteId) =>
        enqueueSiteDeployment({
          siteId,
          kind: "production",
          previewKey: null,
          trigger: "manual",
          branch: "main",
          commitSha: "a".repeat(40),
        })
      )
    );
    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(19);
    for (const result of rejected) {
      expect(result.reason.message).toContain("reached 300 deployments");
    }
    expect(count).toBe(300);
    expect(deployments).toHaveLength(1);
    expect(jobs).toBe(1);
    expect(observed).toEqual([299, ...new Array<number>(19).fill(300)]);
  });
}
