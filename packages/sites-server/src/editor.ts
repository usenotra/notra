import { GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION } from "@notra/ai/constants/github";
import { createOctokit } from "@notra/ai/utils/octokit";
import { db } from "@notra/db/drizzle";
import { siteDrafts, sites } from "@notra/db/schema";
import { validateSite } from "@notra/sites-compiler/validate";
import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import { createDefaultSiteConfig } from "@notra/sites-core/utils/default-config";
import { isSiteSourcePath } from "@notra/sites-core/utils/source-files";
import { and, eq, sql } from "drizzle-orm";

import {
  DEFAULT_PUBLISH_HEADLINE,
  EDITABLE_PATH_SEGMENT,
  EDITABLE_TEXT_FILE,
  MAX_DRAFT_BYTES,
  MAX_PUBLISH_HEADLINE_LENGTH,
  PULL_REQUEST_RULE_TYPES,
  SITE_EDIT_BRANCH_PREFIX,
  VALIDATED_SOURCE_FILE,
} from "./constants/editor";
import { GITHUB_API_VERSION_HEADER } from "./constants/github";
import { SiteInputError, SitePublishConflictError } from "./errors";
import { getBranchHead, siteRepositoryAccess } from "./github";
import type { SiteStorageTransaction } from "./types/deployments";
import type {
  CreateCommitOnBranchResponse,
  PublishSiteDraftsInput,
  PublishSiteDraftsResult,
  RepositoryCommitInput,
  RepositoryPullRequestInput,
  RepositoryFileRef,
  RepositoryBranchInput,
  SaveSiteDraftInput,
  SiteDraftMutationInput,
  SiteDraft,
  SiteSourceEntry,
  SiteSourceFileContent,
  SiteSourceListing,
} from "./types/editor";
import type { SiteRepository } from "./types/github";
import type { Site } from "./types/sites";
import { timestampedBranchName } from "./utils/branch-name";
import { errorMessage, isNotFoundError } from "./utils/errors";
import { prefixedId } from "./utils/ids";
import { repositoryPath } from "./utils/root-directory";

function assertEditablePath(path: string): void {
  const editable =
    isSiteSourcePath(path) &&
    EDITABLE_TEXT_FILE.test(path) &&
    path
      .split("/")
      .every(
        (segment) =>
          !segment.startsWith(".") && EDITABLE_PATH_SEGMENT.test(segment)
      );
  if (!editable) {
    throw new SiteInputError(`${path} is not an editable site file`);
  }
}

function readAccess(site: Site) {
  return siteRepositoryAccess(site, { contents: "read" });
}

export async function listSiteSourceFiles(
  site: Site
): Promise<SiteSourceListing> {
  const { repository, token } = await readAccess(site);
  const head = await getBranchHead(repository, token, site.productionBranch);
  const { data: tree } = await createOctokit(token).request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner: repository.owner,
      repo: repository.repo,
      tree_sha: head.sha,
      recursive: "1",
      headers: GITHUB_API_VERSION_HEADER,
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
    if (!isSiteSourcePath(path)) {
      continue;
    }
    files.push({ path, sha: entry.sha, size: entry.size ?? 0 });
  }
  return {
    commitSha: head.sha,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

export async function readSiteSourceFile(
  site: Site,
  path: string
): Promise<SiteSourceFileContent | null> {
  assertEditablePath(path);
  const { repository, token } = await readAccess(site);
  return await readRepositoryFile(repository, token, {
    path: repositoryPath(site.rootDirectory, path),
    ref: site.productionBranch,
  });
}

export async function readRepositoryFile(
  repository: SiteRepository,
  token: string,
  file: RepositoryFileRef
): Promise<SiteSourceFileContent | null> {
  const octokit = createOctokit(token);
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner: repository.owner,
        repo: repository.repo,
        path: file.path,
        ref: file.ref,
        headers: GITHUB_API_VERSION_HEADER,
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
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function createRepositoryBranch(
  repository: SiteRepository,
  token: string,
  branch: RepositoryBranchInput
): Promise<void> {
  await createOctokit(token).request("POST /repos/{owner}/{repo}/git/refs", {
    owner: repository.owner,
    repo: repository.repo,
    ref: `refs/heads/${branch.name}`,
    sha: branch.sha,
    headers: GITHUB_API_VERSION_HEADER,
  });
}

export async function commitRepositoryFiles(
  repository: SiteRepository,
  token: string,
  commit: RepositoryCommitInput
): Promise<string> {
  const result = await createOctokit(
    token
  ).graphql<CreateCommitOnBranchResponse>(
    GITHUB_CREATE_COMMIT_ON_BRANCH_MUTATION,
    {
      input: {
        branch: {
          repositoryNameWithOwner: `${repository.owner}/${repository.repo}`,
          branchName: commit.branch,
        },
        message: { headline: commit.headline },
        expectedHeadOid: commit.expectedHeadOid,
        fileChanges: {
          additions: commit.additions.map((file) => ({
            path: file.path,
            contents: Buffer.from(file.content).toString("base64"),
          })),
          deletions: commit.deletions.map((path) => ({ path })),
        },
      },
    }
  );
  return result.createCommitOnBranch.commit.oid;
}

export async function openRepositoryPullRequest(
  repository: SiteRepository,
  token: string,
  pullRequest: RepositoryPullRequestInput
): Promise<string> {
  const { data } = await createOctokit(token).request(
    "POST /repos/{owner}/{repo}/pulls",
    {
      owner: repository.owner,
      repo: repository.repo,
      title: pullRequest.title,
      head: pullRequest.head,
      base: pullRequest.base,
      body: pullRequest.body,
      headers: GITHUB_API_VERSION_HEADER,
    }
  );
  return data.html_url;
}

export async function listSiteDrafts(siteId: string): Promise<SiteDraft[]> {
  return await db
    .select()
    .from(siteDrafts)
    .where(eq(siteDrafts.siteId, siteId));
}

// Locks the site row so a branch or root directory change cannot race the
// draft write, and rejects drafts made against a different source.
async function lockSourceContext(
  tx: SiteStorageTransaction,
  siteId: string,
  input: Pick<SiteDraftMutationInput, "path" | "sourceContext">,
  action: "saving" | "discarding"
): Promise<void> {
  const [current] = await tx
    .select()
    .from(sites)
    .where(eq(sites.id, siteId))
    .for("update");
  if (
    !current ||
    current.productionBranch !== input.sourceContext.productionBranch ||
    current.rootDirectory !== input.sourceContext.rootDirectory
  ) {
    throw new SitePublishConflictError(
      [input.path],
      `The site's source changed. Reload the editor before ${action}.`
    );
  }
}

export async function saveSiteDraft(
  site: Site,
  input: SaveSiteDraftInput
): Promise<SiteDraft> {
  assertEditablePath(input.path);
  if (Buffer.byteLength(input.content, "utf8") > MAX_DRAFT_BYTES) {
    throw new SiteInputError("This file is too large to edit in the browser");
  }
  return await db.transaction(async (tx) => {
    await lockSourceContext(tx, site.id, input, "saving");
    if ((input.draftId === null) !== (input.draftRevision === null)) {
      throw new SiteInputError(
        "A draft ID and revision must be supplied together"
      );
    }
    const values = {
      content: input.content,
      baseBlobSha: input.baseBlobSha,
      baseCommitSha: input.baseCommitSha,
      deleted: input.deleted ?? false,
      updatedByUserId: input.userId,
    };
    const [draft] =
      input.draftId === null
        ? await tx
            .insert(siteDrafts)
            .values({
              id: prefixedId("drf"),
              siteId: site.id,
              path: input.path,
              ...values,
            })
            .onConflictDoNothing({
              target: [siteDrafts.siteId, siteDrafts.path],
            })
            .returning()
        : await tx
            .update(siteDrafts)
            .set({
              ...values,
              revision: sql`${siteDrafts.revision} + 1`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(siteDrafts.siteId, site.id),
                eq(siteDrafts.path, input.path),
                eq(siteDrafts.id, input.draftId),
                eq(siteDrafts.revision, input.draftRevision ?? -1)
              )
            )
            .returning();
    if (!draft) {
      throw new SitePublishConflictError(
        [input.path],
        "This draft changed in another editor. Reload it before saving."
      );
    }
    return draft;
  });
}

export async function rebaseSiteDraft(
  site: Site,
  input: SiteDraftMutationInput,
  userId: string
): Promise<SiteDraft | null> {
  const { path } = input;
  const [draft] = await db
    .select()
    .from(siteDrafts)
    .where(and(eq(siteDrafts.siteId, site.id), eq(siteDrafts.path, path)))
    .limit(1);
  if (!draft) {
    if (input.draftId !== null) {
      throw new SitePublishConflictError(
        [path],
        "This draft was removed in another editor. Reload it before rebasing."
      );
    }
    return null;
  }
  const current = await readSiteSourceFile(site, path);
  return await saveSiteDraft(site, {
    ...input,
    content: draft.content,
    deleted: draft.deleted,
    baseBlobSha: current?.sha ?? null,
    baseCommitSha: draft.baseCommitSha,
    userId,
  });
}

export async function discardSiteDraft(
  site: Site,
  input: SiteDraftMutationInput
): Promise<void> {
  await db.transaction(async (tx) => {
    await lockSourceContext(tx, site.id, input, "discarding");
    if (input.draftId === null || input.draftRevision === null) {
      const [existing] = await tx
        .select()
        .from(siteDrafts)
        .where(
          and(eq(siteDrafts.siteId, site.id), eq(siteDrafts.path, input.path))
        )
        .limit(1);
      if (existing) {
        throw new SitePublishConflictError(
          [input.path],
          "This draft changed in another editor. Reload it before discarding."
        );
      }
      return;
    }
    const removed = await tx
      .delete(siteDrafts)
      .where(
        and(
          eq(siteDrafts.siteId, site.id),
          eq(siteDrafts.path, input.path),
          eq(siteDrafts.id, input.draftId),
          eq(siteDrafts.revision, input.draftRevision)
        )
      )
      .returning({ id: siteDrafts.id });
    if (removed.length === 0) {
      throw new SitePublishConflictError(
        [input.path],
        "This draft changed in another editor. Reload it before discarding."
      );
    }
  });
}

async function validateWithDrafts(site: Site, drafts: SiteDraft[]) {
  const { files: tree } = await listSiteSourceFiles(site);
  const files = new Map<string, string | null>();
  for (const entry of tree) {
    files.set(entry.path, null);
  }
  const draftPaths = new Set(drafts.map((draft) => draft.path));
  const needsContent = tree.filter(
    (entry) =>
      (VALIDATED_SOURCE_FILE.test(entry.path) ||
        entry.path === SITE_CONFIG_FILENAME) &&
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
  return validateSite({
    files,
    defaultConfig: createDefaultSiteConfig(site.name),
  });
}

export async function validateSiteDrafts(site: Site) {
  return await validateWithDrafts(site, await listSiteDrafts(site.id));
}

async function requiresPullRequest(
  repository: SiteRepository,
  token: string,
  branch: string
): Promise<boolean> {
  if ((await getBranchHead(repository, token, branch)).protected) {
    return true;
  }
  const { data: rules } = await createOctokit(token).request(
    "GET /repos/{owner}/{repo}/rules/branches/{branch}",
    {
      owner: repository.owner,
      repo: repository.repo,
      branch,
      headers: GITHUB_API_VERSION_HEADER,
    }
  );
  return rules.some((rule) => PULL_REQUEST_RULE_TYPES.has(rule.type));
}

async function assertDirectPublishAllowed(
  site: Site,
  repository: SiteRepository,
  token: string
): Promise<void> {
  if (await requiresPullRequest(repository, token, site.productionBranch)) {
    throw new SiteInputError(
      `${site.productionBranch} is protected on GitHub. Publish as a pull request instead.`
    );
  }
  if (site.publishMode !== "direct") {
    throw new SiteInputError(
      "Direct publishing is turned off for this site. Publish as a pull request instead."
    );
  }
}

export async function publishSiteDrafts(
  site: Site,
  input: PublishSiteDraftsInput
): Promise<PublishSiteDraftsResult> {
  const drafts = await listSiteDrafts(site.id);
  if (drafts.length === 0) {
    throw new SiteInputError("There are no changes to publish");
  }
  const validation = await validateWithDrafts(site, drafts);
  if (!validation.ok) {
    const first = validation.diagnostics.find(
      (diagnostic) => diagnostic.severity === "error"
    );
    throw new SiteInputError(
      `Fix the errors first: ${first?.file ?? "site"}: ${first?.message ?? "invalid site"}`
    );
  }

  const { repository, token } = await siteRepositoryAccess(site, {
    contents: "write",
    pull_requests: "write",
  });
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

  const { mode } = input;
  if (mode === "direct") {
    await assertDirectPublishAllowed(site, repository, token);
  }
  const branch =
    mode === "direct"
      ? site.productionBranch
      : timestampedBranchName(SITE_EDIT_BRANCH_PREFIX, new Date());
  if (mode === "pull_request") {
    await createRepositoryBranch(repository, token, {
      name: branch,
      sha: headSha,
    });
  }

  const headline =
    input.message.trim().slice(0, MAX_PUBLISH_HEADLINE_LENGTH) ||
    DEFAULT_PUBLISH_HEADLINE;
  let commitSha: string;
  try {
    commitSha = await commitRepositoryFiles(repository, token, {
      branch,
      headline,
      expectedHeadOid: headSha,
      additions: drafts
        .filter((draft) => !draft.deleted)
        .map((draft) => ({
          path: repositoryPath(site.rootDirectory, draft.path),
          content: draft.content,
        })),
      deletions: drafts
        .filter((draft) => draft.deleted)
        .map((draft) => repositoryPath(site.rootDirectory, draft.path)),
    });
  } catch (error) {
    if (/expected|head|oid/i.test(errorMessage(error))) {
      throw new SitePublishConflictError(
        [],
        `${branch} moved while publishing. Try again.`
      );
    }
    throw error;
  }

  const pullRequestUrl =
    mode === "pull_request"
      ? await openRepositoryPullRequest(repository, token, {
          title: headline,
          head: branch,
          base: site.productionBranch,
          body: `Edited in Notra.\n\n${drafts.map((draft) => `- ${draft.deleted ? "Delete" : "Update"} \`${draft.path}\``).join("\n")}`,
        })
      : null;
  await Promise.all(
    drafts.map((draft) =>
      db
        .delete(siteDrafts)
        .where(
          and(
            eq(siteDrafts.id, draft.id),
            eq(siteDrafts.revision, draft.revision)
          )
        )
    )
  );
  return { mode, commitSha, pullRequestUrl };
}
