import { GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION } from "@notra/ai/constants/github";
import { createOctokit } from "@notra/ai/utils/octokit";
import { db } from "@notra/db/drizzle";
import { siteDrafts } from "@notra/db/schema";
import { validateSite } from "@notra/sites-compiler/validate";
import {
  SITE_CONFIG_FILENAME,
  SITE_SOURCE_EXTENSIONS,
  SITE_SOURCE_ROOT_ENTRIES,
} from "@notra/sites-core/constants/sites";
import { and, eq } from "drizzle-orm";

import type { Site } from "./deployments";
import {
  requireSiteRepository,
  type SiteRepository,
  siteRepositoryToken,
} from "./github";
import { SiteInputError } from "./sites";

const API_VERSION = { "X-GitHub-Api-Version": "2022-11-28" } as const;
const EDITABLE_TEXT = /\.(?:mdx?|jsx?|json|css)$/i;
const MAX_DRAFT_BYTES = 512 * 1024;
const PATH_SEGMENT = /^[A-Za-z0-9._@()+ -]+$/;

export type SiteDraft = typeof siteDrafts.$inferSelect;

export interface SiteSourceEntry {
  /** Relative to the site root. */
  path: string;
  sha: string;
  size: number;
}

export class SitePublishConflictError extends Error {
  readonly name = "SitePublishConflictError";
  readonly paths: string[];
  constructor(paths: string[], message: string) {
    super(message);
    this.paths = paths;
  }
}

function repoPath(site: Site, sitePath: string): string {
  return site.rootDirectory ? `${site.rootDirectory}/${sitePath}` : sitePath;
}

/** Only files the site actually uses are editable, and never anything outside the site root. */
export function assertEditablePath(path: string): void {
  const segments = path.split("/");
  const allowedRoot = (SITE_SOURCE_ROOT_ENTRIES as readonly string[]).includes(
    segments[0] ?? ""
  );
  const allowedExtension = (SITE_SOURCE_EXTENSIONS as readonly string[]).some(
    (extension) => path.toLowerCase().endsWith(extension)
  );
  if (
    !allowedRoot ||
    !allowedExtension ||
    !EDITABLE_TEXT.test(path) ||
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        segment.startsWith(".") ||
        !PATH_SEGMENT.test(segment)
    )
  ) {
    throw new SiteInputError(`${path} is not an editable site file`);
  }
}

async function readToken(
  site: Site
): Promise<{ repository: SiteRepository; token: string }> {
  const repository = requireSiteRepository(site);
  return {
    repository,
    token: await siteRepositoryToken(repository, { contents: "read" }),
  };
}

/** The site's files on the production branch head, from one recursive tree call. */
export async function listSiteSourceFiles(
  site: Site
): Promise<{ commitSha: string; files: SiteSourceEntry[] }> {
  const { repository, token } = await readToken(site);
  const octokit = createOctokit(token);
  const { data: branch } = await octokit.request(
    "GET /repos/{owner}/{repo}/branches/{branch}",
    {
      owner: repository.owner,
      repo: repository.repo,
      branch: site.productionBranch,
      headers: API_VERSION,
    }
  );
  const { data: tree } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner: repository.owner,
      repo: repository.repo,
      tree_sha: branch.commit.sha,
      recursive: "1",
      headers: API_VERSION,
    }
  );
  const prefix = site.rootDirectory ? `${site.rootDirectory}/` : "";
  const files: SiteSourceEntry[] = [];
  for (const entry of tree.tree) {
    if (
      entry.type !== "blob" ||
      !entry.path ||
      !entry.sha ||
      !entry.path.startsWith(prefix)
    ) {
      continue;
    }
    const path = entry.path.slice(prefix.length);
    const root = path.split("/")[0] ?? "";
    if (!(SITE_SOURCE_ROOT_ENTRIES as readonly string[]).includes(root)) {
      continue;
    }
    files.push({ path, sha: entry.sha, size: entry.size ?? 0 });
  }
  return {
    commitSha: branch.commit.sha,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

export async function readSiteSourceFile(
  site: Site,
  path: string
): Promise<{ content: string; sha: string } | null> {
  assertEditablePath(path);
  const { repository, token } = await readToken(site);
  const octokit = createOctokit(token);
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner: repository.owner,
        repo: repository.repo,
        path: repoPath(site, path),
        ref: site.productionBranch,
        headers: API_VERSION,
      }
    );
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
      return null;
    }
    return {
      content: Buffer.from(data.content, "base64").toString("utf8"),
      sha: data.sha,
    };
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      return null;
    }
    throw error;
  }
}

export async function listSiteDrafts(siteId: string): Promise<SiteDraft[]> {
  return await db
    .select()
    .from(siteDrafts)
    .where(eq(siteDrafts.siteId, siteId));
}

/** Drafts are stored in Notra only; the live site and the repository do not change until publish. */
export async function saveSiteDraft(
  site: Site,
  input: {
    path: string;
    content: string;
    baseBlobSha: string | null;
    baseCommitSha: string | null;
    deleted?: boolean;
    userId: string;
  }
): Promise<SiteDraft> {
  assertEditablePath(input.path);
  if (Buffer.byteLength(input.content, "utf8") > MAX_DRAFT_BYTES) {
    throw new SiteInputError("This file is too large to edit in the browser");
  }
  const [draft] = await db
    .insert(siteDrafts)
    .values({
      id: `drf_${crypto.randomUUID().replaceAll("-", "")}`,
      siteId: site.id,
      path: input.path,
      content: input.content,
      baseBlobSha: input.baseBlobSha,
      baseCommitSha: input.baseCommitSha,
      deleted: input.deleted ?? false,
      updatedByUserId: input.userId,
    })
    .onConflictDoUpdate({
      target: [siteDrafts.siteId, siteDrafts.path],
      // The client sends the version it edits on top of; a rebase after a conflict moves it forward.
      set: {
        content: input.content,
        deleted: input.deleted ?? false,
        baseBlobSha: input.baseBlobSha,
        baseCommitSha: input.baseCommitSha,
        updatedByUserId: input.userId,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!draft) {
    throw new Error("Could not save draft");
  }
  return draft;
}

/**
 * Resolves a publish conflict without losing the edit: the draft keeps its
 * content but is now based on the file as it is on GitHub right now. The user
 * reviews it against the published version before publishing again.
 */
export async function rebaseSiteDraft(
  site: Site,
  path: string
): Promise<SiteDraft | null> {
  const [draft] = await db
    .select()
    .from(siteDrafts)
    .where(and(eq(siteDrafts.siteId, site.id), eq(siteDrafts.path, path)))
    .limit(1);
  if (!draft) {
    return null;
  }
  const current = await readSiteSourceFile(site, path);
  const [updated] = await db
    .update(siteDrafts)
    .set({ baseBlobSha: current?.sha ?? null, updatedAt: new Date() })
    .where(eq(siteDrafts.id, draft.id))
    .returning();
  return updated ?? null;
}

export async function discardSiteDraft(
  siteId: string,
  path: string
): Promise<void> {
  await db
    .delete(siteDrafts)
    .where(and(eq(siteDrafts.siteId, siteId), eq(siteDrafts.path, path)));
}

/**
 * Validates the site as it would look with all drafts applied. Unchanged MDX
 * is only checked for existence (imports); snippets and notra.json are read so
 * named imports and the config can be checked too. Nothing is executed.
 */
export async function validateSiteDrafts(site: Site) {
  const drafts = await listSiteDrafts(site.id);
  const { files: tree } = await listSiteSourceFiles(site);
  const files = new Map<string, string | null>();
  for (const entry of tree) {
    files.set(entry.path, null);
  }
  const draftPaths = new Set(drafts.map((draft) => draft.path));
  const needsContent = tree.filter(
    (entry) =>
      (/\.jsx?$/i.test(entry.path) || entry.path === SITE_CONFIG_FILENAME) &&
      !draftPaths.has(entry.path)
  );
  const contents = await Promise.all(
    needsContent.map((entry) => readSiteSourceFile(site, entry.path))
  );
  for (const [index, entry] of needsContent.entries()) {
    files.set(entry.path, contents[index]?.content ?? null);
  }
  for (const draft of drafts) {
    if (draft.deleted) {
      files.delete(draft.path);
    } else {
      files.set(draft.path, draft.content);
    }
  }
  return validateSite({ files });
}

async function requiresPullRequest(
  repository: SiteRepository,
  token: string,
  branch: string
): Promise<boolean> {
  const octokit = createOctokit(token);
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/branches/{branch}",
    {
      owner: repository.owner,
      repo: repository.repo,
      branch,
      headers: API_VERSION,
    }
  );
  if (data.protected) {
    return true;
  }
  // Repository rulesets do not show up as classic protection.
  const { data: rules } = await octokit.request(
    "GET /repos/{owner}/{repo}/rules/branches/{branch}",
    {
      owner: repository.owner,
      repo: repository.repo,
      branch,
      headers: API_VERSION,
    }
  );
  return rules.some((rule) =>
    [
      "pull_request",
      "required_status_checks",
      "non_fast_forward",
      "update",
    ].includes(rule.type)
  );
}

/**
 * Publishes all drafts as one commit, the way the repository allows it:
 * directly to the production branch when nothing protects it and the site
 * allows it, otherwise as a branch + pull request. Never bypasses protection.
 * A file that changed on GitHub since its draft was started is a conflict.
 */
export async function publishSiteDrafts(
  site: Site,
  input: { message: string; mode: "direct" | "pull_request"; userId: string }
): Promise<{
  mode: "direct" | "pull_request";
  commitSha: string;
  pullRequestUrl: string | null;
}> {
  const drafts = await listSiteDrafts(site.id);
  if (drafts.length === 0) {
    throw new SiteInputError("There are no changes to publish");
  }
  const validation = await validateSiteDrafts(site);
  if (!validation.ok) {
    const first = validation.diagnostics.find(
      (diagnostic) => diagnostic.severity === "error"
    );
    throw new SiteInputError(
      `Fix the errors first: ${first?.file ?? "site"}: ${first?.message ?? "invalid site"}`
    );
  }

  const repository = requireSiteRepository(site);
  const token = await siteRepositoryToken(repository, {
    contents: "write",
    pull_requests: "write",
  });
  const octokit = createOctokit(token);
  const { commitSha: headSha, files } = await listSiteSourceFiles(site);
  const current = new Map(files.map((file) => [file.path, file.sha]));
  const conflicts = drafts
    .filter((draft) => (current.get(draft.path) ?? null) !== draft.baseBlobSha)
    .map((draft) => draft.path);
  if (conflicts.length > 0) {
    throw new SitePublishConflictError(
      conflicts,
      `Changed on GitHub since you started editing: ${conflicts.join(", ")}. Reload them and re-apply your edits.`
    );
  }

  const protectedBranch = await requiresPullRequest(
    repository,
    token,
    site.productionBranch
  );
  const mode =
    input.mode === "direct" && !protectedBranch && site.publishMode === "direct"
      ? "direct"
      : "pull_request";
  if (input.mode === "direct" && mode !== "direct") {
    if (protectedBranch) {
      throw new SiteInputError(
        `${site.productionBranch} is protected on GitHub. Publish as a pull request instead.`
      );
    }
    throw new SiteInputError(
      "Direct publishing is turned off for this site. Publish as a pull request instead."
    );
  }

  let branch = site.productionBranch;
  if (mode === "pull_request") {
    branch = `notra/site-edit-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}`;
    await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
      owner: repository.owner,
      repo: repository.repo,
      ref: `refs/heads/${branch}`,
      sha: headSha,
      headers: API_VERSION,
    });
  }

  let commitSha: string;
  try {
    const result = await octokit.graphql<{
      createCommitOnBranch: { commit: { oid: string } };
    }>(GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION, {
      input: {
        branch: {
          repositoryNameWithOwner: `${repository.owner}/${repository.repo}`,
          branchName: branch,
        },
        message: {
          headline: input.message.trim().slice(0, 200) || "Update site content",
        },
        expectedHeadOid: headSha,
        fileChanges: {
          additions: drafts
            .filter((draft) => !draft.deleted)
            .map((draft) => ({
              path: repoPath(site, draft.path),
              contents: Buffer.from(draft.content).toString("base64"),
            })),
          deletions: drafts
            .filter((draft) => draft.deleted)
            .map((draft) => ({ path: repoPath(site, draft.path) })),
        },
      },
    });
    commitSha = result.createCommitOnBranch.commit.oid;
  } catch (error) {
    const message = (error as Error).message;
    if (/expected|head|oid/i.test(message)) {
      throw new SitePublishConflictError(
        [],
        `${branch} moved while publishing. Try again.`
      );
    }
    throw error;
  }

  let pullRequestUrl: string | null = null;
  if (mode === "pull_request") {
    const { data: pullRequest } = await octokit.request(
      "POST /repos/{owner}/{repo}/pulls",
      {
        owner: repository.owner,
        repo: repository.repo,
        title: input.message.trim().slice(0, 200) || "Update site content",
        head: branch,
        base: site.productionBranch,
        body: `Edited in Notra.\n\n${drafts.map((draft) => `- ${draft.deleted ? "Delete" : "Update"} \`${draft.path}\``).join("\n")}`,
        headers: API_VERSION,
      }
    );
    pullRequestUrl = pullRequest.html_url;
  }
  // Only drafts whose content is exactly what was committed. The upsert keeps the row id,
  // so an autosave that landed while publishing changed the content and must stay.
  for (const draft of drafts) {
    await db
      .delete(siteDrafts)
      .where(
        and(
          eq(siteDrafts.id, draft.id),
          eq(siteDrafts.content, draft.content),
          eq(siteDrafts.deleted, draft.deleted)
        )
      );
  }
  return { mode, commitSha, pullRequestUrl };
}
