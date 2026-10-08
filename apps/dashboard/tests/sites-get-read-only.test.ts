import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  siteDeployments,
  siteDomains,
  siteDrafts,
  sites,
} from "@notra/db/schema";
import { SITE_R2_KEYS } from "@notra/sites-core/constants/sites";
import { createInitialServingState } from "@notra/sites-core/utils/serving-state";
import type { SiteDeployment } from "@notra/sites-server/types/deployments";
import type { Site } from "@notra/sites-server/types/sites";
import { call } from "@orpc/server";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { Effect } from "effect";

if (process.env.NOTRA_SITES_GET_READ_ONLY_TEST_WORKER !== "1") {
  test("Sites GET is read-only and retains 100 history records plus live pins", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          ...process.env,
          NOTRA_SITES_GET_READ_ONLY_TEST_WORKER: "1",
          GEO_INGEST_SECRET: "synthetic-geo-test-secret",
          NEXT_PUBLIC_DEMO_MODE: "false",
        },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  const now = new Date("2026-10-07T10:00:00Z");
  const site: Site = {
    id: "site_readonly",
    activeProductionDeploymentId: null,
    organizationId: "org-readonly",
    projectId: null,
    name: "Read-only site",
    slug: "readonly",
    repositoryId: null,
    githubInstallationId: null,
    githubRepositoryId: null,
    repositoryOwner: "acme",
    repositoryName: "website",
    productionBranch: "main",
    rootDirectory: "",
    publicOrigin: "https://readonly.hosting.example",
    mounts: { blog: "/blog" },
    previewsEnabled: true,
    previewCommentsEnabled: true,
    previewVisibility: "protected",
    publishMode: "pull_request",
    showBranding: true,
    analyticsEnabled: true,
    previewPassword: {
      algorithm: "PBKDF2-SHA256",
      iterations: 1,
      salt: "synthetic",
      hash: "synthetic",
      version: "db-password-version",
      updatedAt: now.toISOString(),
    },
    status: "active",
    suspendedReason: null,
    lastGeneration: 110,
    createdByUserId: "user-readonly",
    createdAt: now,
    updatedAt: now,
  };
  const makeDeployment = (
    id: string,
    index: number,
    previewKey: string | null = null
  ): SiteDeployment => ({
    id,
    siteId: site.id,
    organizationId: site.organizationId,
    kind: previewKey ? "preview" : "production",
    previewKey,
    trigger: "manual",
    status: "ready",
    generation: index,
    branch: previewKey ? "feature" : "main",
    commitSha: `sha-${id}`,
    commitMessage: `Commit ${id}`,
    commitAuthor: "Synthetic",
    pullRequestNumber: null,
    target: {
      publicOrigin: site.publicOrigin,
      mounts: site.mounts,
      noindex: previewKey !== null,
      branding: true,
    },
    configHash: "synthetic",
    toolchainVersion: null,
    fileCount: null,
    totalBytes: null,
    buildDurationMs: null,
    diagnostics: [],
    errorMessage: null,
    checkRunId: null,
    requestedByUserId: null,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date(now.getTime() - index * 1000),
    updatedAt: now,
  });
  const deployments = [
    ...Array.from({ length: 105 }, (_, index) =>
      makeDeployment(`recent-${index}`, index)
    ),
    makeDeployment("production-old", 106),
    makeDeployment("preview-old", 107, "branch-feature"),
  ];
  let state = createInitialServingState({
    siteId: site.id,
    slug: site.slug,
    now,
  });
  const dialect = new PgDialect();
  const write = mock(() => {
    throw new Error("GET attempted a write");
  });
  const deferred = mock((_task: () => unknown) => {});
  const limits: number[] = [];
  const references: unknown[][] = [];
  const select = () => ({
    from: (table: unknown) => {
      let condition: SQL | undefined;
      const rows = () => {
        const params = condition ? dialect.sqlToQuery(condition).params : [];
        if (table === sites) {
          return params[0] === site.id ? [site] : [];
        }
        if (table === siteDomains || table === siteDrafts) {
          return [];
        }
        if (table === siteDeployments) {
          if (params.length > 1) {
            references.push(params);
            return deployments.filter((deployment) =>
              params.slice(1).includes(deployment.id)
            );
          }
          return deployments;
        }
        throw new Error("Unexpected DB table");
      };
      const query = {
        where: (input: SQL) => {
          condition = input;
          return query;
        },
        orderBy: () => query,
        limit: async (limit: number) => {
          if (table === siteDeployments) {
            limits.push(limit);
          }
          return rows().slice(0, limit);
        },
        then: <TResult>(resolve: (value: ReturnType<typeof rows>) => TResult) =>
          Promise.resolve(rows()).then(resolve),
      };
      return query;
    },
  });
  mock.module("@notra/db/drizzle", () => ({
    createDb: write,
    db: {
      select,
      update: write,
      insert: write,
      delete: write,
      execute: write,
      transaction: write,
    },
  }));
  const r2 = await import("@notra/sites-server/r2");
  const readR2 = async (key: string) => {
    expect(key).toBe(SITE_R2_KEYS.state(site.id));
    return { text: JSON.stringify(state), etag: "synthetic-etag" };
  };
  mock.module("@notra/sites-server/r2", () => ({
    ...r2,
    r2GetText: readR2,
    r2GetTextEffect: (key: string) =>
      Effect.tryPromise({ try: () => readR2(key), catch: (error) => error }),
    r2Put: write,
    r2PutEffect: () => Effect.sync(write),
    r2DeleteKey: write,
    r2DeleteKeyIfMatch: write,
  }));
  mock.module("../src/lib/framework/after-response", () => ({
    afterResponse: deferred,
  }));
  mock.module("../src/lib/auth/organization", () => ({
    assertAuthenticated: async () => ({
      session: {},
      user: { id: "user-readonly" },
    }),
    assertOrganizationAccess: async () => ({
      membership: { role: "owner" },
      user: { id: "user-readonly" },
    }),
  }));
  mock.module("../src/lib/sites/access", () => ({
    assertSitesAccess: async () => {},
  }));
  const env = await import("@notra/sites-server/env");
  mock.module("@notra/sites-server/env", () => ({
    ...env,
    isSitesConfigured: () => true,
    getSitesHostingDomain: () => "hosting.example",
    getSitesHostingPortSuffix: () => "",
    getSitesHostingProtocol: () => "https",
    siteCnameTarget: () => "cname.hosting.example",
  }));
  const { isGeoIngestConfigured } = await import("@notra/geo-core/geo/ingest");
  const { sitesRouter } = await import("../src/lib/orpc/routers/sites");
  const { createORPCContext } = await import("../src/lib/orpc/context");
  beforeEach(() => {
    write.mockClear();
    deferred.mockClear();
    limits.length = 0;
    references.length = 0;
    state = createInitialServingState({
      siteId: site.id,
      slug: site.slug,
      now,
    });
    state.production = {
      deploymentId: "production-old",
      generation: 106,
      activatedAt: now.toISOString(),
    };
    state.previews["branch-feature"] = {
      deploymentId: "preview-old",
      visibility: "protected",
      sequence: 107,
      activatedAt: now.toISOString(),
      expiresAt: null,
    };
  });

  test.each(["mismatched-password", "missing-traffic-token"])(
    "GET does not repair %s while returning canonical history",
    async (mode) => {
      const password = site.previewPassword;
      if (!password) {
        throw new Error("Expected a saved preview password");
      }
      state.previewPassword = {
        ...password,
        version:
          mode === "mismatched-password"
            ? "old-password-version"
            : password.version,
      };
      state.trafficToken =
        mode === "missing-traffic-token" ? null : "existing-token";
      expect(isGeoIngestConfigured()).toBe(true);
      const before = JSON.stringify(state);
      const context = await createORPCContext({ headers: new Headers() });
      const result = await call(
        sitesRouter.get,
        { organizationId: site.organizationId, siteId: site.id },
        { context }
      );
      expect(limits).toEqual([100]);
      expect(references).toEqual([[site.id, "production-old", "preview-old"]]);
      expect(result.deployments).toHaveLength(102);
      expect(
        result.deployments
          .filter((deployment) => deployment.live)
          .map((deployment) => deployment.id)
      ).toEqual(["production-old", "preview-old"]);
      expect(
        result.deployments.some((deployment) => deployment.id === "recent-99")
      ).toBe(true);
      expect(
        result.deployments.some((deployment) => deployment.id === "recent-100")
      ).toBe(false);
      expect(result.previews[0]).toMatchObject({
        deploymentId: "preview-old",
        branch: "feature",
        commitSha: "sha-preview-old",
      });
      expect(result.site.previewPasswordSetAt).toBe(password.updatedAt);
      expect(write).not.toHaveBeenCalled();
      expect(deferred).not.toHaveBeenCalled();
      expect(JSON.stringify(state)).toBe(before);
    }
  );
}
