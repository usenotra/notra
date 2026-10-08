import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { call } from "@orpc/server";

import { site } from "./constants/site-editor";
import type {
  DefaultEditorDraft,
  DefaultEditorSaveDraftInput,
} from "./types/site-editor";

if (process.env.NOTRA_DEFAULT_EDITOR_TEST_WORKER !== "1") {
  test("defaults-first editor and integrations in an isolated process", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_DEFAULT_EDITOR_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  }, 35_000);
} else {
  let config: string | null = null;
  let draft: DefaultEditorDraft | null = null;
  let writes = 0;
  mock.module("../src/lib/auth/organization", () => ({
    assertAuthenticated: async () => ({
      session: {},
      user: { id: "user-demo" },
    }),
    assertOrganizationAccess: async () => ({
      membership: { role: "owner" },
      user: { id: "user-demo" },
    }),
  }));
  mock.module("../src/lib/sites/access", () => ({
    assertSitesAccess: async () => {},
  }));
  const env = await import("@notra/sites-server/env");
  mock.module("@notra/sites-server/env", () => ({
    ...env,
    isSitesConfigured: () => true,
  }));
  const sites = await import("@notra/sites-server/deployments");
  mock.module("@notra/sites-server/deployments", () => ({
    ...sites,
    getSite: async () => site,
  }));
  const editor = await import("@notra/sites-server/editor");
  mock.module("@notra/sites-server/editor", () => ({
    ...editor,
    listSiteSourceFiles: async () => ({
      commitSha: "a".repeat(40),
      files:
        config === null
          ? []
          : [{ path: "blog.json", sha: "blob-config", size: config.length }],
    }),
    readSiteSourceFile: async () =>
      config === null ? null : { content: config, sha: "blob-config" },
    listSiteDrafts: async () => (draft ? [draft] : []),
    saveSiteDraft: async (
      _site: unknown,
      input: DefaultEditorSaveDraftInput
    ) => {
      writes += 1;
      draft = {
        path: "blog.json",
        content: input.content,
        baseBlobSha: input.baseBlobSha,
        baseCommitSha: input.baseCommitSha,
        deleted: false,
        updatedAt: new Date(),
      };
      return draft;
    },
    discardSiteDraft: async () => {
      draft = null;
    },
  }));
  const { sitesRouter } = await import("../src/lib/orpc/routers/sites");
  const { createORPCContext } = await import("../src/lib/orpc/context");
  const { readSiteIntegrations, saveSiteIntegration } =
    await import("@notra/sites-server/integrations");
  const { getSite } = await import("@notra/sites-server/deployments");
  beforeEach(() => {
    config = null;
    draft = null;
    writes = 0;
  });

  test("missing config appears as a virtual editable file without creating a draft", async () => {
    const context = await createORPCContext({ headers: new Headers() });
    const input = { organizationId: "org-demo", siteId: "site_demo" };
    const files = await call(sitesRouter.editor.files, input, { context });
    expect(files.files).toHaveLength(1);
    expect(files.files[0]).toMatchObject({ path: "blog.json", sha: "" });
    expect(files.drafts).toEqual([]);
    const read = await call(
      sitesRouter.editor.read,
      { ...input, path: "blog.json" },
      { context }
    );
    expect(JSON.parse(read.content)).toMatchObject({
      name: "Default Acme",
      blog: { layout: "grid" },
      changelog: { layout: "timeline" },
    });
    expect(read).toMatchObject({
      published: null,
      blobSha: null,
      publishedBlobSha: null,
      hasDraft: false,
      draftId: null,
      draftRevision: null,
      sourceContext: { productionBranch: "main", rootDirectory: "" },
    });
    expect(writes).toBe(0);
  });
  test("existing valid and invalid config contents are never replaced by defaults", async () => {
    for (const content of ['{"name":"Repository Acme"}', "{invalid", ""]) {
      config = content;
      const context = await createORPCContext({ headers: new Headers() });
      const input = { organizationId: "org-demo", siteId: "site_demo" };
      const files = await call(sitesRouter.editor.files, input, { context });
      expect(files.files[0]?.sha).toBe("blob-config");
      expect(
        (
          await call(
            sitesRouter.editor.read,
            { ...input, path: "blog.json" },
            { context }
          )
        ).content
      ).toBe(content);
    }
    expect(writes).toBe(0);
  });
  test("provider settings start from defaults and persist only as a real config draft", async () => {
    const actualSite = await getSite("site_demo");
    if (!actualSite) {
      throw new Error("Expected test site");
    }
    expect(await readSiteIntegrations(actualSite)).toMatchObject({
      integrations: {},
      hasDraft: false,
      invalid: false,
    });
    await saveSiteIntegration(actualSite, {
      provider: "plausible",
      settings: { domain: "example.com" },
      userId: "user-demo",
    });
    expect(writes).toBe(1);
    expect(JSON.parse(draft?.content ?? "{}")).toMatchObject({
      name: "Default Acme",
      integrations: { plausible: { domain: "example.com" } },
    });
    expect(draft?.baseBlobSha).toBeNull();
    expect(config).toBeNull();
  });
}
