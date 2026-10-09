import {
  afterAll,
  afterEach,
  beforeEach,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { SaveSiteDraftInput } from "../src/types/editor";
import type { Site } from "../src/types/sites";

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const databaseUrl = process.env.SITES_TEST_DATABASE_URL;
if (!databaseUrl) {
  test.skip("Draft CAS requires the approved SITES_TEST_DATABASE_URL", () => {});
} else if (process.env.NOTRA_DRAFT_CAS_POSTGRES_TEST_WORKER !== "1") {
  test("draft revisions fence concurrent writes and publication on real PostgreSQL", () => {
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
          NOTRA_DRAFT_CAS_POSTGRES_TEST_WORKER: "1",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
        },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  const url = new URL(databaseUrl);
  expect(url.hostname).toBe("127.0.0.1");
  expect(url.port).toBe("55447");
  expect(url.pathname).toBe("/notra_server_audit");
  expect(process.env.DATABASE_URL).toBe(databaseUrl);
  const { db } = await import("@notra/db/drizzle");
  const { organizations, users, sites, siteDrafts } =
    await import("@notra/db/schema");
  const { eq } = await import("drizzle-orm");
  let site: Site;
  let userId = "";
  let organizationId = "";
  let beforeCommit = async () => {};
  let beforeRead = async () => {};
  let blobSha = "blob-current";
  const octokit = await import("@notra/ai/utils/octokit");
  mock.module("@notra/ai/utils/octokit", () => ({
    ...octokit,
    createOctokit: () => ({
      request: async (route: string) => {
        if (route.includes("/git/trees/")) {
          return {
            data: {
              tree: [
                { type: "blob", path: "blog.json", sha: blobSha, size: 10 },
              ],
            },
          };
        }
        if (route.includes("/contents/")) {
          await beforeRead();
          return {
            data: {
              type: "file",
              content: Buffer.from(
                JSON.stringify({ name: "Published" })
              ).toString("base64"),
              sha: blobSha,
            },
          };
        }
        if (route.includes("/rules/branches/")) {
          return { data: [] };
        }
        throw new Error(`Unexpected synthetic GitHub request: ${route}`);
      },
      graphql: async () => {
        await beforeCommit();
        return {
          createCommitOnBranch: { commit: { oid: "published-commit" } },
        };
      },
    }),
  }));
  const github = await import("../src/github");
  mock.module("../src/github", () => ({
    ...github,
    siteRepositoryAccess: async () => ({
      repository: { owner: "synthetic", repo: "synthetic" },
      token: "synthetic-token",
    }),
    getBranchHead: async () => ({
      sha: "head-current",
      protected: false,
      message: "Synthetic",
      author: "Synthetic",
    }),
  }));
  const editor = await import("../src/editor");
  const {
    saveSiteDraft,
    discardSiteDraft,
    rebaseSiteDraft,
    publishSiteDrafts,
  } = editor;
  const { saveSiteIntegration } = await import("../src/integrations");
  const input = (
    content: string,
    draftId: string | null = null,
    draftRevision: number | null = null
  ): SaveSiteDraftInput => ({
    path: "blog.json",
    content,
    baseBlobSha: "blob-current",
    baseCommitSha: "head-original",
    userId,
    draftId,
    draftRevision,
    sourceContext: {
      productionBranch: site.productionBranch,
      rootDirectory: site.rootDirectory,
    },
  });
  beforeEach(async () => {
    beforeCommit = async () => {};
    beforeRead = async () => {};
    blobSha = "blob-current";
    organizationId = `draft-cas-${crypto.randomUUID()}`;
    userId = `${organizationId}-user`;
    await db.insert(users).values({
      id: userId,
      name: "Synthetic draft admin",
      email: `${userId}@example.test`,
    });
    await db.insert(organizations).values({
      id: organizationId,
      name: "Synthetic draft CAS",
      slug: organizationId,
      createdAt: new Date(),
    });
    const [created] = await db
      .insert(sites)
      .values({
        id: `${organizationId}-site`,
        organizationId,
        name: "Synthetic",
        slug: crypto.randomUUID().slice(0, 8),
        publicOrigin: "https://synthetic.example.test",
        mounts: { blog: "/blog" },
        publishMode: "direct",
      })
      .returning();
    if (!created) {
      throw new Error("Expected synthetic site");
    }
    site = created;
  });
  afterEach(async () => {
    await db.delete(organizations).where(eq(organizations.id, organizationId));
    await db.delete(users).where(eq(users.id, userId));
  });
  afterAll(async () => {
    await Reflect.get(db, "$client").end();
  });

  test("two creators and two updates from the same observation produce one explicit conflict", async () => {
    const creation = await Promise.allSettled([
      saveSiteDraft(site, input("A")),
      saveSiteDraft(site, input("B")),
    ]);
    expect(
      creation.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    expect(
      creation.filter((result) => result.status === "rejected")
    ).toHaveLength(1);
    const [initial] = await editor.listSiteDrafts(site.id);
    if (!initial) {
      throw new Error("Expected draft");
    }
    const updates = await Promise.allSettled([
      saveSiteDraft(site, input("C", initial.id, initial.revision)),
      saveSiteDraft(site, input("D", initial.id, initial.revision)),
    ]);
    expect(
      updates.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    expect(
      updates.filter((result) => result.status === "rejected")
    ).toHaveLength(1);
    const [stored] = await editor.listSiteDrafts(site.id);
    if (!stored) {
      throw new Error("Expected updated draft");
    }
    expect(stored?.revision).toBe(initial.revision + 1);
    expect(["C", "D"]).toContain(stored.content);
  });

  test("delete/recreate ABA cannot be updated or discarded using an old draft ID/revision", async () => {
    const initial = await saveSiteDraft(site, input("A"));
    const observed = input("A", initial.id, initial.revision);
    await discardSiteDraft(site, observed);
    const replacement = await saveSiteDraft(site, input("B"));
    expect(replacement.revision).toBe(initial.revision);
    expect(replacement.id).not.toBe(initial.id);
    await expect(saveSiteDraft(site, observed)).rejects.toThrow(
      "another editor"
    );
    await expect(discardSiteDraft(site, observed)).rejects.toThrow(
      "another editor"
    );
    expect((await editor.listSiteDrafts(site.id))[0]?.content).toBe("B");
  });

  test("rebase advances the draft revision without weakening Git blob conflict checks", async () => {
    const initial = await saveSiteDraft(site, input('{"name":"Draft"}'));
    blobSha = "blob-upstream";
    await expect(
      publishSiteDrafts(site, { mode: "direct", message: "Synthetic", userId })
    ).rejects.toThrow("Changed on GitHub");
    const rebased = await rebaseSiteDraft(
      site,
      input(initial.content, initial.id, initial.revision),
      userId
    );
    expect(rebased?.revision).toBe(initial.revision + 1);
    expect(rebased?.baseBlobSha).toBe("blob-upstream");
    expect(rebased?.baseCommitSha).toBe("head-original");
    await expect(
      saveSiteDraft(site, input("stale", initial.id, initial.revision))
    ).rejects.toThrow("another editor");
    expect((await editor.listSiteDrafts(site.id))[0]?.content).toBe(
      initial.content
    );
  });

  test("publication cleanup does not delete a concurrent A-to-B-to-A draft revision", async () => {
    const content = '{"name":"Draft"}';
    const initial = await saveSiteDraft(site, input(content));
    beforeCommit = async () => {
      const second = await saveSiteDraft(
        site,
        input('{"name":"Other"}', initial.id, initial.revision)
      );
      await saveSiteDraft(site, input(content, second.id, second.revision));
    };
    expect(
      await publishSiteDrafts(site, {
        mode: "direct",
        message: "Synthetic",
        userId,
      })
    ).toMatchObject({ commitSha: "published-commit" });
    const [stored] = await editor.listSiteDrafts(site.id);
    expect(stored?.content).toBe(content);
    expect(stored?.revision).toBe(initial.revision + 2);
  });

  test("a rebase racing a newer edit cannot restore its stale content", async () => {
    const initial = await saveSiteDraft(site, input("initial"));
    const started = deferred();
    const resume = deferred();
    beforeRead = async () => {
      started.resolve();
      await resume.promise;
    };
    const rebasing = rebaseSiteDraft(
      site,
      input("initial", initial.id, initial.revision),
      userId
    ).catch((error: unknown) => error);
    await started.promise;
    const edited = await saveSiteDraft(
      site,
      input("newer edit", initial.id, initial.revision)
    );
    resume.resolve();
    expect(await rebasing).toMatchObject({ name: "SitePublishConflictError" });
    const [stored] = await editor.listSiteDrafts(site.id);
    expect(stored?.content).toBe("newer edit");
    expect(stored?.revision).toBe(edited.revision);
  });

  test("a new draft racing a source-setting transaction waits for its lock and rejects stale context", async () => {
    const stale = input("new file from stale read");
    const locked = deferred();
    const resume = deferred();
    const settings = db.transaction(async (tx) => {
      await tx.select().from(sites).where(eq(sites.id, site.id)).for("update");
      locked.resolve();
      await resume.promise;
      await tx
        .update(sites)
        .set({ rootDirectory: "new-root" })
        .where(eq(sites.id, site.id));
    });
    await locked.promise;
    const save = saveSiteDraft(site, stale).catch((error: unknown) => error);
    resume.resolve();
    await settings;
    expect(await save).toMatchObject({
      name: "SitePublishConflictError",
      message: "The site's source changed. Reload the editor before saving.",
    });
    expect(await editor.listSiteDrafts(site.id)).toEqual([]);
  });

  test("racing integration merges preserve both provider settings or report an explicit conflict", async () => {
    const original = editor.listSiteDrafts;
    const gate = deferred();
    let reads = 0;
    const observation = spyOn(editor, "listSiteDrafts").mockImplementation(
      async (siteId) => {
        const rows = await original(siteId);
        reads += 1;
        if (reads === 2) {
          gate.resolve();
        }
        await gate.promise;
        return rows;
      }
    );
    try {
      const results = await Promise.allSettled([
        saveSiteIntegration(site, {
          provider: "plausible",
          settings: { domain: "synthetic.example.test" },
          userId,
        }),
        saveSiteIntegration(site, {
          provider: "ga4",
          settings: { measurementId: "G-SYNTHETIC" },
          userId,
        }),
      ]);
      expect(
        results.filter((result) => result.status === "fulfilled")
      ).toHaveLength(1);
      const rejected = results.find((result) => result.status === "rejected");
      expect(
        rejected?.status === "rejected" && rejected.reason.message
      ).toContain("another editor");
    } finally {
      observation.mockRestore();
    }
    const [stored] = await editor.listSiteDrafts(site.id);
    const integrations = JSON.parse(stored?.content ?? "{}").integrations;
    expect(Object.keys(integrations)).toHaveLength(1);
  });

  test.each(["productionBranch", "rootDirectory"] as const)(
    "an observed old %s cannot create a draft after settings changes",
    async (field) => {
      const stale = input("stale new-file content");
      await db
        .update(sites)
        .set({
          [field]: field === "productionBranch" ? "other" : "subdirectory",
        })
        .where(eq(sites.id, site.id));
      await expect(saveSiteDraft(site, stale)).rejects.toThrow(
        "source changed"
      );
      expect(await editor.listSiteDrafts(site.id)).toEqual([]);
    }
  );
}
