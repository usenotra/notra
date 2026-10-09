import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";

import type { Site } from "../src/types/sites";

const databaseUrl = process.env.SITES_TEST_DATABASE_URL;
if (!databaseUrl) {
  test.skip("GitHub consent regressions require the synthetic PostgreSQL database", () => {});
} else if (process.env.NOTRA_SITES_CONSENT_TEST_WORKER !== "1") {
  test("current GitHub consent gates token minting and signed webhook discovery", () => {
    const url = new URL(databaseUrl);
    expect(url.hostname).toBe("127.0.0.1");
    expect(url.pathname).toBe("/notra_server_audit");
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          NOTRA_SITES_CONSENT_TEST_WORKER: "1",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
        },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const { db } = await import("@notra/db/drizzle");
  const {
    githubAppInstallations,
    githubIntegrations,
    organizations,
    sites,
    users,
    siteJobs,
    siteWebhookDeliveries,
  } = await import("@notra/db/schema");
  const { eq, inArray } = await import("drizzle-orm");
  const mint = mock(async () => "synthetic-consent-token");
  mock.module("@notra/ai/integrations/github", () => ({
    createScopedGitHubAppInstallationToken: mint,
  }));
  const octokit = await import("@notra/ai/utils/octokit");
  mock.module("@notra/ai/utils/octokit", () => ({
    ...octokit,
    createOctokit: () => {
      throw new Error("Unexpected GitHub request");
    },
  }));
  const { requireSiteRepository, siteRepositoryAccess, siteRepositoryToken } =
    await import("../src/github");
  const { requireOrganizationRepository, organizationRepositorySuggestions } =
    await import("../src/repositories");
  const { handleSitesWebhook } = await import("../src/webhooks");
  let organizationId = "";
  let foreignOrganizationId = "";
  let userId = "";
  let installationId = "";
  let integrationId = "";
  let snapshot: Site;
  const deliveries: string[] = [];
  process.env.SITES_HOSTING_DOMAIN = "notra.site";

  beforeEach(async () => {
    mint.mockClear();
    organizationId = `consent-${crypto.randomUUID()}`;
    foreignOrganizationId = `${organizationId}-foreign`;
    userId = `${organizationId}-user`;
    installationId = `${organizationId}-installation`;
    integrationId = `${organizationId}-repository`;
    await db.insert(users).values({
      id: userId,
      name: "Synthetic consent user",
      email: `${userId}@example.test`,
    });
    await db.insert(organizations).values(
      [organizationId, foreignOrganizationId].map((id) => ({
        id,
        name: "Synthetic consent",
        slug: id,
        createdAt: new Date(),
      }))
    );
    await db.insert(githubAppInstallations).values({
      id: installationId,
      organizationId,
      createdByUserId: userId,
      installationId: "100",
      accountId: "200",
      accountLogin: "synthetic",
      accountAvatarUrl: "https://example.test/avatar",
      accountType: "Organization",
    });
    await db.insert(githubIntegrations).values({
      id: integrationId,
      organizationId,
      createdByUserId: userId,
      displayName: "Synthetic repo",
      githubAppInstallationId: installationId,
      githubRepositoryId: "500",
      owner: "synthetic",
      repo: "repo",
    });
    const [site] = await db
      .insert(sites)
      .values({
        id: `${organizationId}-site`,
        organizationId,
        name: "Synthetic consent",
        slug: crypto.randomUUID().slice(0, 8),
        repositoryId: integrationId,
        githubInstallationId: "100",
        githubRepositoryId: "500",
        repositoryOwner: "synthetic",
        repositoryName: "repo",
        publicOrigin: "https://example.test",
        mounts: { blog: "/blog" },
      })
      .returning();
    if (!site) {
      throw new Error("Expected synthetic site");
    }
    snapshot = site;
  });
  afterEach(async () => {
    await db
      .delete(siteWebhookDeliveries)
      .where(inArray(siteWebhookDeliveries.deliveryId, deliveries));
    deliveries.length = 0;
    await db
      .delete(organizations)
      .where(
        inArray(organizations.id, [organizationId, foreignOrganizationId])
      );
    await db.delete(users).where(eq(users.id, userId));
  });
  afterAll(async () => {
    await Reflect.get(db, "$client").end();
  });

  test("approved consent mints only a repository-scoped token", async () => {
    const access = await siteRepositoryAccess(snapshot, { contents: "read" });
    expect(access.token).toBe("synthetic-consent-token");
    expect(mint).toHaveBeenCalledWith("100", {
      repositories: ["repo"],
      permissions: { metadata: "read", contents: "read" },
    });
  });

  test.each([
    "integration",
    "repository",
    "installation",
    "removed",
    "foreign",
    "replaced",
    "repository_identity",
    "installation_identity",
  ])("%s consent rejects stale site snapshots before minting", async (kind) => {
    if (kind === "integration") {
      await db
        .update(githubIntegrations)
        .set({ enabled: false })
        .where(eq(githubIntegrations.id, integrationId));
    } else if (kind === "repository") {
      await db
        .update(githubIntegrations)
        .set({ repositoryEnabled: false })
        .where(eq(githubIntegrations.id, integrationId));
    } else if (kind === "installation") {
      await db
        .update(githubAppInstallations)
        .set({ enabled: false })
        .where(eq(githubAppInstallations.id, installationId));
    } else if (kind === "removed") {
      await db
        .delete(githubIntegrations)
        .where(eq(githubIntegrations.id, integrationId));
    } else if (kind === "foreign") {
      snapshot = { ...snapshot, organizationId: foreignOrganizationId };
    } else if (kind === "repository_identity") {
      await db
        .update(githubIntegrations)
        .set({ githubRepositoryId: "501" })
        .where(eq(githubIntegrations.id, integrationId));
    } else if (kind === "installation_identity") {
      await db
        .update(githubAppInstallations)
        .set({ installationId: "101" })
        .where(eq(githubAppInstallations.id, installationId));
    } else {
      await db
        .update(sites)
        .set({ repositoryId: null })
        .where(eq(sites.id, snapshot.id));
    }
    await expect(
      siteRepositoryAccess(snapshot, {
        contents: "write",
        pull_requests: "write",
      })
    ).rejects.toThrow();
    expect(mint).not.toHaveBeenCalled();
    expect(requireSiteRepository(snapshot)).toMatchObject({
      owner: "synthetic",
      repo: "repo",
      installationId: "100",
    });
  });

  test("the shared token factory, organization suggestions and pre-site starter authority reject disabled approval", async () => {
    const { repository } = await requireOrganizationRepository(
      organizationId,
      integrationId
    );
    await db
      .update(githubAppInstallations)
      .set({ enabled: false })
      .where(eq(githubAppInstallations.id, installationId));
    await expect(
      siteRepositoryToken(repository, { contents: "write" })
    ).rejects.toThrow();
    await expect(
      organizationRepositorySuggestions({
        organizationId,
        repositoryId: integrationId,
        ref: null,
      })
    ).rejects.toThrow();
    await expect(
      siteRepositoryAccess(snapshot, { contents: "read" })
    ).rejects.toThrow();
    expect(mint).not.toHaveBeenCalled();
  });

  test("signed push deliveries do not schedule disconnected or disabled sites", async () => {
    const rawBody = JSON.stringify({
      ref: "refs/heads/main",
      after: "a".repeat(40),
      repository: { id: 500 },
      installation: { id: 100 },
    });
    const secret = "synthetic-webhook-secret";
    const signature = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
    for (const policy of [
      "disconnected",
      "repository",
      "installation",
      "approved",
    ]) {
      await db
        .update(sites)
        .set({ repositoryId: policy === "disconnected" ? null : integrationId })
        .where(eq(sites.id, snapshot.id));
      await db
        .update(githubIntegrations)
        .set({ repositoryEnabled: policy !== "repository" })
        .where(eq(githubIntegrations.id, integrationId));
      await db
        .update(githubAppInstallations)
        .set({ enabled: policy !== "installation" })
        .where(eq(githubAppInstallations.id, installationId));
      const deliveryId = crypto.randomUUID();
      deliveries.push(deliveryId);
      const result = await handleSitesWebhook({
        event: "push",
        deliveryId,
        rawBody,
        secret,
        signature,
      });
      if (!result) {
        throw new Error("Expected a recognized push delivery");
      }
      expect(result.jobIds).toHaveLength(policy === "approved" ? 1 : 0);
    }
    expect(
      await db.select().from(siteJobs).where(eq(siteJobs.siteId, snapshot.id))
    ).toHaveLength(1);
    expect(mint).not.toHaveBeenCalled();
  });
}
