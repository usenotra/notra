import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { SiteDomain } from "../src/types/domains";
import type { R2PutOptions } from "../src/types/r2";
import type { Site } from "../src/types/sites";

const databaseUrl = process.env.SITES_TEST_DATABASE_URL;
if (!databaseUrl) {
  test.skip("host reclaim requires synthetic PostgreSQL", () => {});
} else if (process.env.NOTRA_HOST_RECLAIM_WORKER !== "1") {
  test("verified host reclaim with PostgreSQL and conditional synthetic R2", () => {
    const url = new URL(databaseUrl);
    expect(url.hostname).toBe("127.0.0.1");
    expect(url.port).toBe("55447");
    expect(url.pathname).toBe("/notra_server_audit");
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          NOTRA_HOST_RECLAIM_WORKER: "1",
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
  const { organizations, sites, siteDomains } =
    await import("@notra/db/schema");
  const { eq } = await import("drizzle-orm");
  const { SITE_R2_KEYS } = await import("@notra/sites-core/constants/sites");
  const { R2PreconditionFailedError } = await import("../src/errors");
  let organizationId = "";
  let oldSite: Site;
  let newSite: Site;
  let oldDomain: SiteDomain;
  let candidate: SiteDomain;
  let objects = new Map<string, { text: string; etag: string }>();
  let sequence = 0;
  let verified = true;
  let tlsActive = true;
  let proofHostname = "";
  let onPut = async () => {};
  let onDelete = async () => {};
  let onProof = async () => {};
  let failAfterPut = false;
  let failOriginWrite = false;
  let originWrites = 0;
  const providerDeletes: string[] = [];
  mock.module("../src/r2", () => ({
    r2GetText: async (key: string) => objects.get(key) ?? null,
    r2Put: async (key: string, text: string, options: R2PutOptions) => {
      await onPut();
      const current = objects.get(key);
      if (
        (options.ifNoneMatch && current) ||
        (options.ifMatch && current?.etag !== options.ifMatch)
      ) {
        throw new R2PreconditionFailedError("synthetic CAS conflict");
      }
      const etag = String(++sequence);
      objects.set(key, { text, etag });
      if (failAfterPut) {
        failAfterPut = false;
        throw new Error("synthetic lost write response");
      }
      return etag;
    },
    r2DeleteKey: async (key: string) => {
      await onDelete();
      objects.delete(key);
    },
  }));
  mock.module("../src/cloudflare-saas", () => ({
    cloudflareSaasConfig: () => ({}),
    getCustomHostname: async (_config: unknown, id: string) => {
      await onProof();
      return {
        id,
        hostname: proofHostname || candidate.hostname,
        status: verified ? "active" : "pending",
        ssl: { status: verified && tlsActive ? "active" : "pending" },
      };
    },
    deleteCustomHostnameQuietly: async (id: string | null) => {
      if (id) {
        providerDeletes.push(id);
      }
    },
    createCustomHostname: () => {
      throw new Error("unexpected provider create");
    },
    findCustomHostname: () => {
      throw new Error("unexpected provider lookup");
    },
    deleteCustomHostname: () => {
      throw new Error("unexpected provider delete");
    },
  }));
  mock.module("../src/sites", () => ({
    setSitePublicOrigin: async (site: Site, origin: string) => {
      originWrites += 1;
      await db
        .update(sites)
        .set({ publicOrigin: origin })
        .where(eq(sites.id, site.id));
      if (failOriginWrite) {
        throw new Error("synthetic rebuild failure");
      }
      return "synthetic-job";
    },
  }));
  const { refreshSiteDomain, removeSiteDomain } =
    await import("../src/domains");
  const { claimHostRecord, releaseHostRecord } = await import("../src/state");
  process.env.SITES_HOSTING_DOMAIN = "notra.site";
  process.env.SITES_CNAME_TARGET = "cname.notra.site";

  const mapping = (siteId: string, kind = "custom") => {
    objects.set(SITE_R2_KEYS.host(candidate.hostname), {
      text: JSON.stringify({ version: 1, siteId, kind }),
      etag: String(++sequence),
    });
  };
  const mappedSite = () =>
    JSON.parse(objects.get(SITE_R2_KEYS.host(candidate.hostname))?.text ?? "{}")
      .siteId;

  beforeEach(async () => {
    organizationId = crypto.randomUUID();
    objects = new Map();
    verified = true;
    tlsActive = true;
    proofHostname = "";
    onPut = async () => {};
    onDelete = async () => {};
    onProof = async () => {};
    originWrites = 0;
    failAfterPut = false;
    failOriginWrite = false;
    providerDeletes.length = 0;
    await db.insert(organizations).values({
      id: organizationId,
      name: "Synthetic host reclaim",
      slug: organizationId,
      createdAt: new Date(),
    });
    const inserted = await db
      .insert(sites)
      .values(
        [0, 1].map(() => ({
          id: crypto.randomUUID(),
          organizationId,
          name: "Synthetic",
          slug: crypto.randomUUID(),
          publicOrigin: "https://alias.notra.site",
          mounts: { blog: "/blog" },
        }))
      )
      .returning();
    [oldSite, newSite] = inserted as [Site, Site];
    const hostname = `${crypto.randomUUID()}.example.test`;
    [oldDomain, candidate] = (await db
      .insert(siteDomains)
      .values([
        {
          id: crypto.randomUUID(),
          siteId: oldSite.id,
          organizationId,
          hostname,
          kind: "subdomain",
          status: "failed",
          cloudflareHostnameId: crypto.randomUUID(),
        },
        {
          id: crypto.randomUUID(),
          siteId: newSite.id,
          organizationId,
          hostname,
          kind: "subdomain",
          status: "pending",
          cloudflareHostnameId: crypto.randomUUID(),
        },
      ])
      .returning()) as [SiteDomain, SiteDomain];
    mapping(oldSite.id);
  });
  afterEach(async () => {
    await db.delete(organizations).where(eq(organizations.id, organizationId));
  });
  afterAll(async () => {
    await Reflect.get(db, "$client").end();
  });

  test("verified candidate reclaims a failed host and old removal/build cannot erase it", async () => {
    const result = await refreshSiteDomain(newSite, candidate.id, null);
    expect(result.domain.status).toBe("active");
    expect(mappedSite()).toBe(newSite.id);
    expect(originWrites).toBe(1);
    const [old] = await db
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, oldDomain.id));
    expect(old?.cloudflareHostnameId).toBeNull();
    await removeSiteDomain(oldSite, oldDomain.id, oldSite.publicOrigin, null);
    expect(providerDeletes).toEqual([]);
    await expect(
      claimHostRecord(candidate.hostname, {
        siteId: oldSite.id,
        kind: "custom",
      })
    ).rejects.toThrow("already belongs");
    expect(mappedSite()).toBe(newSite.id);
  });

  test("an active legitimate owner is rejected before any R2 mutation", async () => {
    await db
      .update(siteDomains)
      .set({ status: "active" })
      .where(eq(siteDomains.id, oldDomain.id));
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("verified this domain first");
    expect(mappedSite()).toBe(oldSite.id);
    expect(originWrites).toBe(0);
  });

  test("unverifiable candidates and transient old-owner failure keep the published mapping", async () => {
    verified = false;
    expect(
      (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
    ).toBe("verifying");
    await db
      .update(siteDomains)
      .set({ status: "active" })
      .where(eq(siteDomains.id, oldDomain.id));
    expect(
      (await refreshSiteDomain(oldSite, oldDomain.id, null)).domain.status
    ).toBe("failed");
    expect(mappedSite()).toBe(oldSite.id);
    expect(originWrites).toBe(0);
  });

  test("a competing R2 replacement causes CAS failure and rolls back activation", async () => {
    const foreignId = crypto.randomUUID();
    onPut = async () => {
      mapping(foreignId);
    };
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("CAS conflict");
    expect(mappedSite()).toBe(foreignId);
    const [row] = await db
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, candidate.id));
    expect(row?.status).toBe("pending");
    expect(originWrites).toBe(0);
  });

  test("an inactive certificate or mismatched provider hostname is not proof", async () => {
    tlsActive = false;
    expect(
      (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
    ).toBe("verifying");
    tlsActive = true;
    proofHostname = `${crypto.randomUUID()}.example.test`;
    expect(
      (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
    ).toBe("verifying");
    expect(mappedSite()).toBe(oldSite.id);
    expect(originWrites).toBe(0);
  });

  test("reserved alias and derived preview hostnames never enter reclaim", async () => {
    for (const hostname of ["alias.notra.site", "preview.alias.notra.site"]) {
      candidate = { ...candidate, hostname };
      await db
        .update(siteDomains)
        .set({ hostname })
        .where(eq(siteDomains.id, candidate.id));
      mapping(oldSite.id);
      await expect(
        refreshSiteDomain(newSite, candidate.id, null)
      ).rejects.toThrow("already provided by Notra");
      expect(mappedSite()).toBe(oldSite.id);
    }
    expect(originWrites).toBe(0);
  });

  test("old release and verified replacement share the hostname lock", async () => {
    let markEntered = () => {};
    let resumeDelete = () => {};
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const resume = new Promise<void>((resolve) => {
      resumeDelete = resolve;
    });
    onDelete = async () => {
      markEntered();
      await resume;
    };
    const removal = releaseHostRecord(candidate.hostname, oldSite.id);
    await entered;
    const replacement = refreshSiteDomain(newSite, candidate.id, null);
    resumeDelete();
    await Promise.all([removal, replacement]);
    expect(mappedSite()).toBe(newSite.id);
  });

  test("an ambiguous R2 write leaves a safe claim that verified retry can complete", async () => {
    failAfterPut = true;
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("lost write response");
    expect(mappedSite()).toBe(newSite.id);
    const [row] = await db
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, candidate.id));
    expect(row?.status).toBe("pending");
    await expect(
      refreshSiteDomain(oldSite, oldDomain.id, null)
    ).rejects.toThrow("not a failed");
    expect(
      (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
    ).toBe("active");
    expect(mappedSite()).toBe(newSite.id);
  });

  test("post-activation rebuild failure retains ownership and the updated public origin", async () => {
    failOriginWrite = true;
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("rebuild failure");
    expect(mappedSite()).toBe(newSite.id);
    const [row] = await db
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, candidate.id));
    expect(row?.status).toBe("active");
    failOriginWrite = false;
    const [current] = await db
      .select()
      .from(sites)
      .where(eq(sites.id, newSite.id));
    if (!current) {
      throw new Error("Synthetic site disappeared");
    }
    expect(current.publicOrigin).toBe(`https://${candidate.hostname}`);
    expect(
      (await refreshSiteDomain(current, candidate.id, null)).rebuildJobId
    ).toBeNull();
  });

  test("unrelated, alias, and unknown custom mappings cannot be reclaimed", async () => {
    for (const [owner, kind] of [
      [oldSite.id, "alias"],
      [crypto.randomUUID(), "custom"],
    ] as const) {
      mapping(owner, kind);
      await expect(
        refreshSiteDomain(newSite, candidate.id, null)
      ).rejects.toThrow();
      expect(mappedSite()).toBe(owner);
    }
    expect(originWrites).toBe(0);
  });

  test("removal during verification cannot resurrect a removed candidate", async () => {
    onProof = async () => {
      await removeSiteDomain(newSite, candidate.id, newSite.publicOrigin, null);
    };
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("changed during verification");
    expect(mappedSite()).toBe(oldSite.id);
  });

  test("concurrent verified candidates serialize and only one becomes active", async () => {
    const [otherSite] = await db
      .insert(sites)
      .values({
        id: crypto.randomUUID(),
        organizationId,
        name: "Synthetic",
        slug: crypto.randomUUID(),
        publicOrigin: newSite.publicOrigin,
        mounts: newSite.mounts,
      })
      .returning();
    if (!otherSite) {
      throw new Error("Synthetic site insert failed");
    }
    const [other] = await db
      .insert(siteDomains)
      .values({
        ...candidate,
        id: crypto.randomUUID(),
        siteId: otherSite.id,
        cloudflareHostnameId: crypto.randomUUID(),
      })
      .returning();
    if (!other) {
      throw new Error("Synthetic domain insert failed");
    }
    const results = await Promise.allSettled([
      refreshSiteDomain(newSite, candidate.id, null),
      refreshSiteDomain(otherSite, other.id, null),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    expect([newSite.id, otherSite.id]).toContain(mappedSite());
  });
}
