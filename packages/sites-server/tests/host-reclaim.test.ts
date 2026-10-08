import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import type { CloudflareCustomHostname } from "../src/types/cloudflare-saas";
import type { SiteDomain } from "../src/types/domains";
import type { R2PutOptions } from "../src/types/r2";
import type { Site } from "../src/types/sites";
import { deferred } from "./utils/deferred";

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
  const { eq, inArray } = await import("drizzle-orm");
  const { SITE_R2_KEYS } = await import("@notra/sites-core/constants/sites");
  const { R2PreconditionFailedError } = await import("../src/errors");
  let organizationId = "";
  let otherOrganizationId = "";
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
  let dnsRecords: string[][] | null = null;
  let dnsError = false;
  let createConflict = false;
  let createResponseId = "";
  let providerExisting: CloudflareCustomHostname | null = null;
  let providerReads = 0;
  let failNextGet = false;
  let onCreate = async (_created: CloudflareCustomHostname) => {};
  const providerCreates: string[] = [];
  const providerDeletes: string[] = [];
  mock.module("../src/utils/ids", () => ({
    prefixedId: () => crypto.randomUUID(),
  }));
  process.env.SITES_PREVIEW_SECRET = "synthetic-host-ownership-secret";
  const dns = await import("node:dns/promises");
  mock.module("node:dns/promises", () => ({
    ...dns,
    lookup: () => {
      throw new Error("Unexpected DNS address lookup");
    },
    Resolver: class {
      setServers(servers: string[]) {
        expect(servers).toEqual(["1.1.1.1", "1.0.0.1"]);
      }
      async resolveTxt(name: string) {
        await onProof();
        expect(name).toBe(`_notra.${candidate.hostname}`);
        if (dnsError) {
          throw new Error("Synthetic DNS failure");
        }
        return (
          dnsRecords ?? [
            [domainOwnershipRecord(newSite.id, candidate.hostname).value],
          ]
        );
      }
      cancel() {}
    },
  }));
  const { domainOwnershipRecord } =
    await import("../src/utils/domain-ownership");
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
      providerReads += 1;
      if (failNextGet) {
        failNextGet = false;
        throw new Error("Synthetic provider GET failure");
      }
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
    createCustomHostname: async (_config: unknown, hostname: string) => {
      if (createConflict) {
        throw new Error("Synthetic hostname already exists");
      }
      const id = createResponseId || crypto.randomUUID();
      const created = {
        id,
        hostname,
        status: "pending",
        ssl: { status: "pending" },
        ownership_verification: {
          type: "txt",
          name: `_cf-custom-hostname.${hostname}`,
          value: `synthetic-${id}`,
        },
      };
      providerExisting = created;
      providerCreates.push(created.id);
      await onCreate(created);
      return created;
    },
    findCustomHostname: async () => {
      providerReads += 1;
      return providerExisting;
    },
    deleteCustomHostname: async (_config: unknown, id: string) => {
      providerDeletes.push(id);
      providerExisting = null;
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
  const { addSiteDomain, refreshSiteDomain, removeSiteDomain } =
    await import("../src/domains");
  const { claimHostRecord, releaseHostRecord } = await import("../src/state");
  const { customHostnameBindingDatabase } =
    await import("../src/utils/bind-custom-hostname");
  const { withSiteHostLock } = await import("../src/utils/site-host-lock");
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
    otherOrganizationId = crypto.randomUUID();
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
    dnsRecords = null;
    dnsError = false;
    createConflict = false;
    createResponseId = "";
    providerExisting = null;
    providerReads = 0;
    providerCreates.length = 0;
    failNextGet = false;
    onCreate = async () => {};
    await db.insert(organizations).values(
      [organizationId, otherOrganizationId].map((id) => ({
        id,
        name: "Synthetic host reclaim",
        slug: id,
        createdAt: new Date(),
      }))
    );
    const inserted = await db
      .insert(sites)
      .values(
        [organizationId, otherOrganizationId].map((organizationId) => ({
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
          organizationId: newSite.organizationId,
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
    await db
      .delete(organizations)
      .where(inArray(organizations.id, [organizationId, otherOrganizationId]));
  });
  afterAll(async () => {
    await Reflect.get(customHostnameBindingDatabase(), "$client").end();
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
    dnsRecords = [
      [domainOwnershipRecord(oldSite.id, candidate.hostname).value],
    ];
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
    dnsRecords = [
      [domainOwnershipRecord(oldSite.id, candidate.hostname).value],
    ];
    await expect(
      refreshSiteDomain(oldSite, oldDomain.id, null)
    ).rejects.toThrow("not a failed");
    dnsRecords = null;
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
        organizationId: newSite.organizationId,
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
    dnsRecords = [newSite, otherSite].map((site) => [
      domainOwnershipRecord(site.id, candidate.hostname).value,
    ]);
    const results = await Promise.allSettled([
      refreshSiteDomain(newSite, candidate.id, null),
      refreshSiteDomain(otherSite, other.id, null),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    expect([newSite.id, otherSite.id]).toContain(mappedSite());
  });

  test("another workspace can add pending or failed hostnames without deleting their provider resource", async () => {
    createConflict = true;
    providerExisting = {
      id: oldDomain.cloudflareHostnameId as string,
      hostname: candidate.hostname,
      status: "active",
      ssl: { status: "active" },
    };
    for (const status of ["pending", "failed"] as const) {
      await db.delete(siteDomains).where(eq(siteDomains.id, candidate.id));
      await db
        .update(siteDomains)
        .set({ status })
        .where(eq(siteDomains.id, oldDomain.id));
      candidate = await addSiteDomain(newSite, {
        kind: "subdomain",
        value: oldDomain.hostname,
      });
      expect(candidate.cloudflareHostnameId).toBeNull();
      expect(candidate.verificationRecords).toContainEqual(
        domainOwnershipRecord(newSite.id, candidate.hostname)
      );
      expect(providerDeletes).toEqual([]);
      const [old] = await db
        .select()
        .from(siteDomains)
        .where(eq(siteDomains.id, oldDomain.id));
      expect(old?.cloudflareHostnameId).toBe(oldDomain.cloudflareHostnameId);
      expect(mappedSite()).toBe(oldSite.id);
    }
  });

  test("missing, old-owner and wrong-host TXT records never authorize provider replacement", async () => {
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    providerExisting = {
      id: oldDomain.cloudflareHostnameId as string,
      hostname: candidate.hostname,
      status: "active",
    };
    for (const records of [
      [],
      [[domainOwnershipRecord(oldSite.id, candidate.hostname).value]],
      [
        [
          domainOwnershipRecord(
            newSite.id,
            `${crypto.randomUUID()}.example.test`
          ).value,
        ],
      ],
    ]) {
      dnsRecords = records;
      expect(
        (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
      ).toBe("verifying");
      expect(providerDeletes).toEqual([]);
      expect(providerReads).toBe(0);
      expect(mappedSite()).toBe(oldSite.id);
    }
  });

  test("DNS errors and oversized TXT responses fail closed before provider calls", async () => {
    dnsError = true;
    expect(
      (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
    ).toBe("verifying");
    dnsError = false;
    dnsRecords = Array.from({ length: 33 }, () => [
      domainOwnershipRecord(newSite.id, candidate.hostname).value,
    ]);
    expect(
      (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
    ).toBe("verifying");
    dnsRecords = [
      ["x".repeat(8193)],
      [domainOwnershipRecord(newSite.id, candidate.hostname).value],
    ];
    expect(
      (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
    ).toBe("verifying");
    expect(providerReads).toBe(0);
    expect(providerDeletes).toEqual([]);
    expect(mappedSite()).toBe(oldSite.id);
  });

  test("site-bound TXT proof authorizes failed provider replacement and TLS-gated R2 transfer", async () => {
    const oldHostnameId = oldDomain.cloudflareHostnameId;
    if (!oldHostnameId) {
      throw new Error("Expected synthetic provider resource");
    }
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    providerExisting = {
      id: oldDomain.cloudflareHostnameId as string,
      hostname: candidate.hostname,
      status: "active",
    };
    const oldOrigin = `https://${candidate.hostname}`;
    await db
      .update(sites)
      .set({ publicOrigin: oldOrigin })
      .where(eq(sites.id, oldSite.id));
    const token = domainOwnershipRecord(newSite.id, candidate.hostname).value;
    dnsRecords = [[token.slice(0, 20), token.slice(20)]];
    tlsActive = false;
    const awaitingTls = await refreshSiteDomain(newSite, candidate.id, null);
    expect(awaitingTls.domain.cloudflareHostnameId).not.toBeNull();
    expect(awaitingTls.domain.status).toBe("verifying");
    expect(providerDeletes).toEqual([oldHostnameId]);
    expect(mappedSite()).toBe(oldSite.id);
    tlsActive = true;
    expect(
      (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
    ).toBe("active");
    expect(mappedSite()).toBe(newSite.id);
    const [old] = await db.select().from(sites).where(eq(sites.id, oldSite.id));
    expect(old?.publicOrigin).toBe(oldOrigin);
  });

  test("a candidate identity changed during TXT resolution cannot trigger provider effects", async () => {
    onProof = async () => {
      await db
        .update(siteDomains)
        .set({ cloudflareHostnameId: crypto.randomUUID() })
        .where(eq(siteDomains.id, candidate.id));
    };
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("changed during verification");
    expect(providerReads).toBe(0);
    expect(providerDeletes).toEqual([]);
    expect(mappedSite()).toBe(oldSite.id);
  });

  test("valid TXT proof still cannot delete an unrelated provider resource", async () => {
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    providerExisting = {
      id: crypto.randomUUID(),
      hostname: candidate.hostname,
      status: "active",
    };
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("unrelated provider mapping");
    expect(providerDeletes).toEqual([]);
    expect(mappedSite()).toBe(oldSite.id);
  });

  test("TXT challenges bind both site and normalized hostname", () => {
    const record = domainOwnershipRecord(newSite.id, candidate.hostname);
    expect(
      domainOwnershipRecord(newSite.id, candidate.hostname.toUpperCase()).value
    ).toBe(record.value);
    expect(
      domainOwnershipRecord(oldSite.id, candidate.hostname).value
    ).not.toBe(record.value);
    expect(
      domainOwnershipRecord(newSite.id, `${crypto.randomUUID()}.example.test`)
        .value
    ).not.toBe(record.value);
  });

  test("add never stores another claim's provider identity even if create returns it", async () => {
    await db.delete(siteDomains).where(eq(siteDomains.id, candidate.id));
    createResponseId = oldDomain.cloudflareHostnameId as string;
    candidate = await addSiteDomain(newSite, {
      kind: "subdomain",
      value: oldDomain.hostname,
    });
    expect(candidate.cloudflareHostnameId).toBeNull();
    await removeSiteDomain(newSite, candidate.id, newSite.publicOrigin, null);
    expect(providerDeletes).toEqual([]);
    expect(mappedSite()).toBe(oldSite.id);
  });

  test("legacy shared provider identities are replaced only after the candidate's TXT proof", async () => {
    const oldHostnameId = oldDomain.cloudflareHostnameId;
    if (!oldHostnameId) {
      throw new Error("Expected synthetic provider resource");
    }
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: oldHostnameId })
      .where(eq(siteDomains.id, candidate.id));
    providerExisting = {
      id: oldHostnameId,
      hostname: candidate.hostname,
      status: "active",
    };
    const result = await refreshSiteDomain(newSite, candidate.id, null);
    expect(result.domain.cloudflareHostnameId).not.toBe(oldHostnameId);
    expect(result.domain.status).toBe("active");
    expect(providerDeletes).toEqual([oldHostnameId]);
    expect(mappedSite()).toBe(newSite.id);
    await removeSiteDomain(oldSite, oldDomain.id, oldSite.publicOrigin, null);
    expect(providerDeletes).toEqual([oldHostnameId]);
  });

  test("an unrelated R2 owner is rejected before proved provider replacement", async () => {
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    providerExisting = {
      id: oldDomain.cloudflareHostnameId as string,
      hostname: candidate.hostname,
      status: "active",
    };
    const unrelated = crypto.randomUUID();
    mapping(unrelated);
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("not a failed custom-domain claim");
    expect(providerReads).toBe(0);
    expect(providerDeletes).toEqual([]);
    expect(mappedSite()).toBe(unrelated);
  });

  test("a newly provisioned resource stays durably bound after R2 rollback and retries without recreating it", async () => {
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    const oldHostnameId = oldDomain.cloudflareHostnameId;
    if (!oldHostnameId) {
      throw new Error("Expected synthetic provider resource");
    }
    providerExisting = {
      id: oldHostnameId,
      hostname: candidate.hostname,
      status: "active",
    };
    failAfterPut = true;
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("lost write response");
    expect(mappedSite()).toBe(newSite.id);
    expect(providerDeletes).toEqual([oldHostnameId]);
    const [row] = await db
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, candidate.id));
    expect(row?.cloudflareHostnameId).toBe(providerCreates[0]);
    expect(row?.status).toBe("pending");
    expect(
      (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
    ).toBe("active");
    expect(providerDeletes).toEqual([oldHostnameId]);
    expect(providerCreates).toHaveLength(1);
    expect(mappedSite()).toBe(newSite.id);
  });

  test("provider GET failure preserves the new binding and invalidated old ID for a safe retry", async () => {
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    const oldHostnameId = oldDomain.cloudflareHostnameId;
    if (!oldHostnameId) {
      throw new Error("Expected synthetic provider resource");
    }
    providerExisting = {
      id: oldHostnameId,
      hostname: candidate.hostname,
      status: "active",
    };
    failNextGet = true;
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("provider GET failure");
    const [bound] = await db
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, candidate.id));
    const [old] = await db
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, oldDomain.id));
    expect(bound?.cloudflareHostnameId).toBe(providerCreates[0]);
    expect(bound?.verificationRecords).toContainEqual(
      expect.objectContaining({
        name: `_cf-custom-hostname.${candidate.hostname}`,
        value: `synthetic-${providerCreates[0]}`,
      })
    );
    expect(bound?.status).toBe("pending");
    expect(old?.cloudflareHostnameId).toBeNull();
    expect(mappedSite()).toBe(oldSite.id);
    expect(
      (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
    ).toBe("active");
    expect(providerCreates).toHaveLength(1);
    expect(providerDeletes).toEqual([oldHostnameId]);
  });

  test("fresh provisioning survives an R2 failure before write without losing the old route", async () => {
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    const oldHostnameId = oldDomain.cloudflareHostnameId;
    if (!oldHostnameId) {
      throw new Error("Expected synthetic provider resource");
    }
    providerExisting = {
      id: oldHostnameId,
      hostname: candidate.hostname,
      status: "active",
    };
    onPut = async () => {
      throw new Error("Synthetic R2 unavailable");
    };
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("R2 unavailable");
    const [bound] = await db
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, candidate.id));
    expect(bound?.cloudflareHostnameId).toBe(providerCreates[0]);
    expect(bound?.status).toBe("pending");
    expect(mappedSite()).toBe(oldSite.id);
    onPut = async () => {};
    expect(
      (await refreshSiteDomain(newSite, candidate.id, null)).domain.status
    ).toBe("active");
    expect(providerCreates).toHaveLength(1);
    expect(providerDeletes).toEqual([oldHostnameId]);
  });

  test("refresh record-generation failure compensates its known unbound resource", async () => {
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    onCreate = async () => {
      delete process.env.SITES_PREVIEW_SECRET;
    };
    try {
      await expect(
        refreshSiteDomain(newSite, candidate.id, null)
      ).rejects.toThrow("SITES_PREVIEW_SECRET is not set");
      expect(providerCreates).toHaveLength(1);
      expect(providerDeletes).toEqual(providerCreates);
      const [row] = await db
        .select()
        .from(siteDomains)
        .where(eq(siteDomains.id, candidate.id));
      expect(row?.cloudflareHostnameId).toBeNull();
      expect(mappedSite()).toBe(oldSite.id);
    } finally {
      process.env.SITES_PREVIEW_SECRET = "synthetic-host-ownership-secret";
    }
  });

  test("a removed candidate compensates only its just-created unbound resource", async () => {
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    providerExisting = null;
    onCreate = async () => {
      await db.delete(siteDomains).where(eq(siteDomains.id, candidate.id));
    };
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("changed during verification");
    expect(providerDeletes).toEqual(providerCreates);
    expect(mappedSite()).toBe(oldSite.id);
    expect(
      await db
        .select()
        .from(siteDomains)
        .where(eq(siteDomains.id, candidate.id))
    ).toHaveLength(0);
  });

  test("a replaced candidate binding is preserved while the unbound fresh resource is compensated", async () => {
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    const replacementId = crypto.randomUUID();
    onCreate = async () => {
      await db
        .update(siteDomains)
        .set({ cloudflareHostnameId: replacementId })
        .where(eq(siteDomains.id, candidate.id));
    };
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("changed during verification");
    const [row] = await db
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, candidate.id));
    expect(row?.cloudflareHostnameId).toBe(replacementId);
    expect(providerDeletes).toEqual(providerCreates);
    expect(providerDeletes).not.toContain(replacementId);
    expect(mappedSite()).toBe(oldSite.id);
  });

  test("binding failure never compensates a provider ID referenced by another existing claim", async () => {
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    const foreignId = crypto.randomUUID();
    await db
      .update(siteDomains)
      .set({
        hostname: `${crypto.randomUUID()}.example.test`,
        cloudflareHostnameId: foreignId,
      })
      .where(eq(siteDomains.id, oldDomain.id));
    createResponseId = foreignId;
    objects.delete(SITE_R2_KEYS.host(candidate.hostname));
    await expect(
      refreshSiteDomain(newSite, candidate.id, null)
    ).rejects.toThrow("belongs to another claim");
    expect(providerDeletes).toEqual([]);
    const [old] = await db
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, oldDomain.id));
    expect(old?.cloudflareHostnameId).toBe(foreignId);
  });

  test("domain insert failure happens before provider creation and leaves other claims untouched", async () => {
    await expect(
      addSiteDomain(
        { ...newSite, id: crypto.randomUUID() },
        { kind: "subdomain", value: candidate.hostname }
      )
    ).rejects.toThrow();
    expect(providerCreates).toEqual([]);
    expect(providerDeletes).toEqual([]);
    const [old] = await db
      .select()
      .from(siteDomains)
      .where(eq(siteDomains.id, oldDomain.id));
    expect(old?.cloudflareHostnameId).toBe(oldDomain.cloudflareHostnameId);
    expect(mappedSite()).toBe(oldSite.id);
  });

  test("ADD callback failure compensates only the known fresh provider resource", async () => {
    await db.delete(siteDomains).where(eq(siteDomains.id, candidate.id));
    onCreate = async () => {
      delete process.env.SITES_PREVIEW_SECRET;
    };
    try {
      await expect(
        addSiteDomain(newSite, { kind: "subdomain", value: candidate.hostname })
      ).rejects.toThrow("SITES_PREVIEW_SECRET is not set");
      expect(providerCreates).toHaveLength(1);
      expect(providerDeletes).toEqual(providerCreates);
      expect(providerDeletes).not.toContain(oldDomain.cloudflareHostnameId);
      const [old] = await db
        .select()
        .from(siteDomains)
        .where(eq(siteDomains.id, oldDomain.id));
      expect(old?.cloudflareHostnameId).toBe(oldDomain.cloudflareHostnameId);
      expect(
        await db
          .select()
          .from(siteDomains)
          .where(eq(siteDomains.siteId, newSite.id))
      ).toHaveLength(0);
      expect(mappedSite()).toBe(oldSite.id);
    } finally {
      process.env.SITES_PREVIEW_SECRET = "synthetic-host-ownership-secret";
    }
  });

  test("binding commits with a saturated primary pool and uses only one dedicated connection", async () => {
    await db
      .update(siteDomains)
      .set({ cloudflareHostnameId: null })
      .where(eq(siteDomains.id, candidate.id));
    verified = false;
    const entered = deferred();
    const resume = deferred();
    onCreate = async () => {
      entered.resolve();
      await resume.promise;
    };
    const primary = Reflect.get(db, "$client");
    const binding = customHostnameBindingDatabase();
    expect(customHostnameBindingDatabase()).toBe(binding);
    expect(Reflect.get(binding, "$client").options.max).toBe(1);
    const owner = refreshSiteDomain(newSite, candidate.id, null);
    owner.catch(() => {});
    await entered.promise;
    const waiters = Array.from({ length: primary.options.max - 1 }, () =>
      withSiteHostLock(candidate.hostname, async () => {}, {
        organizationId: newSite.organizationId,
      })
    );
    try {
      for (
        let attempt = 0;
        attempt < 100 &&
        (primary.totalCount !== primary.options.max || primary.idleCount !== 0);
        attempt += 1
      ) {
        await delay(10);
      }
      expect(primary.totalCount).toBe(primary.options.max);
      expect(primary.idleCount).toBe(0);
      resume.resolve();
      const result = await Promise.race([
        owner,
        delay(2000).then(() => {
          throw new Error("Binding starved behind hostname waiters");
        }),
      ]);
      const createdId = providerCreates[0];
      if (!createdId) {
        throw new Error("Expected synthetic provider creation");
      }
      expect(result.domain.cloudflareHostnameId).toBe(createdId);
      expect(result.domain.status).toBe("verifying");
      expect(mappedSite()).toBe(oldSite.id);
    } finally {
      resume.resolve();
      await Promise.allSettled([owner, ...waiters]);
    }
  });
}
