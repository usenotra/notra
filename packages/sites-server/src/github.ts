import { createScopedGitHubAppInstallationToken } from "@notra/ai/integrations/github";
import { createOctokit } from "@notra/ai/utils/octokit";
import { db } from "@notra/db/drizzle";
import {
  githubAppInstallations,
  githubIntegrations,
  sites,
} from "@notra/db/schema";
import { SITE_CONFIG_FILENAME } from "@notra/sites-core/constants/sites";
import { and, eq } from "drizzle-orm";

import {
  BRANCH_SUGGESTION_LIMIT,
  CONFIG_SEARCH_SKIPPED_SEGMENTS,
  CONTENT_FILE,
  EMPTY_TREE_SCAN,
  GITHUB_API_VERSION_HEADER,
  GITHUB_PAGE_SIZE,
  MAX_TARBALL_BYTES,
} from "./constants/github";
import { SitePermanentBuildError } from "./errors";
import type {
  BranchHead,
  CompleteCheckRunParams,
  CreateCheckRunParams,
  RepositoryContentCount,
  RepositorySuggestions,
  RepositoryTreeScan,
  SiteRepository,
  SiteRepositoryAccess,
  SiteRepositoryColumns,
  SiteRepositoryPermissions,
} from "./types/github";
import { readBodyUpTo } from "./utils/read-body";

export function requireSiteRepository(
  site: SiteRepositoryColumns
): SiteRepository {
  if (
    !(site.githubInstallationId && site.repositoryOwner && site.repositoryName)
  ) {
    throw new SitePermanentBuildError(
      "This site has no GitHub repository connected"
    );
  }
  return {
    organizationId: site.organizationId,
    integrationId: site.repositoryId,
    githubRepositoryId: site.githubRepositoryId,
    installationId: site.githubInstallationId,
    owner: site.repositoryOwner,
    repo: site.repositoryName,
  };
}

export async function siteRepositoryAccess(
  site: SiteRepositoryColumns,
  permissions: SiteRepositoryPermissions
): Promise<SiteRepositoryAccess> {
  const [current] = await db
    .select()
    .from(sites)
    .where(
      and(eq(sites.id, site.id), eq(sites.organizationId, site.organizationId))
    )
    .limit(1);
  if (
    !current ||
    current.repositoryId !== site.repositoryId ||
    current.githubRepositoryId !== site.githubRepositoryId ||
    current.githubInstallationId !== site.githubInstallationId ||
    current.repositoryOwner !== site.repositoryOwner ||
    current.repositoryName !== site.repositoryName
  ) {
    throw new SitePermanentBuildError(
      "This site's repository association changed or was removed"
    );
  }
  const repository = requireSiteRepository(current);
  return {
    repository,
    token: await siteRepositoryToken(repository, permissions),
  };
}

export async function siteRepositoryToken(
  repository: SiteRepository,
  permissions: SiteRepositoryPermissions
): Promise<string> {
  if (!(repository.integrationId && repository.githubRepositoryId)) {
    throw new SitePermanentBuildError(
      "This site's GitHub repository is disconnected"
    );
  }
  const [approved] = await db
    .select({ id: githubIntegrations.id })
    .from(githubIntegrations)
    .innerJoin(
      githubAppInstallations,
      eq(githubIntegrations.githubAppInstallationId, githubAppInstallations.id)
    )
    .where(
      and(
        eq(githubIntegrations.id, repository.integrationId),
        eq(githubIntegrations.organizationId, repository.organizationId),
        eq(githubAppInstallations.organizationId, repository.organizationId),
        eq(
          githubIntegrations.githubRepositoryId,
          repository.githubRepositoryId
        ),
        eq(githubIntegrations.owner, repository.owner),
        eq(githubIntegrations.repo, repository.repo),
        eq(githubAppInstallations.installationId, repository.installationId),
        eq(githubIntegrations.enabled, true),
        eq(githubIntegrations.repositoryEnabled, true),
        eq(githubAppInstallations.enabled, true)
      )
    )
    .limit(1);
  if (!approved) {
    throw new SitePermanentBuildError(
      "This site's GitHub repository is no longer approved by this workspace"
    );
  }
  return await createScopedGitHubAppInstallationToken(
    repository.installationId,
    {
      repositories: [repository.repo],
      permissions: { metadata: "read", ...permissions },
    }
  );
}

export async function downloadRepositoryTarball(
  repository: SiteRepository,
  token: string,
  commitSha: string
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(
    `https://api.github.com/repos/${repository.owner}/${repository.repo}/tarball/${commitSha}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        ...GITHUB_API_VERSION_HEADER,
      },
      redirect: "follow",
    }
  );
  if (!response.ok) {
    throw new Error(
      `Downloading ${repository.owner}/${repository.repo}@${commitSha.slice(0, 7)} failed (${response.status})`
    );
  }
  const declared = Number(response.headers.get("content-length") ?? 0);
  const body =
    declared > MAX_TARBALL_BYTES
      ? null
      : await readBodyUpTo(response, MAX_TARBALL_BYTES);
  if (!body || body.exceeded) {
    throw new SitePermanentBuildError("The repository is too large to build");
  }
  return body.bytes;
}

export async function getBranchHead(
  repository: SiteRepository,
  token: string,
  branch: string
): Promise<BranchHead> {
  const octokit = createOctokit(token);
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/branches/{branch}",
    {
      owner: repository.owner,
      repo: repository.repo,
      branch,
      headers: GITHUB_API_VERSION_HEADER,
    }
  );
  return {
    sha: data.commit.sha,
    protected: data.protected,
    message: data.commit.commit.message.split("\n")[0] ?? null,
    author:
      data.commit.commit.author?.name ?? data.commit.author?.login ?? null,
  };
}

export async function createCheckRun(
  repository: SiteRepository,
  token: string,
  params: CreateCheckRunParams
): Promise<string> {
  const octokit = createOctokit(token);
  const { data } = await octokit.request(
    "POST /repos/{owner}/{repo}/check-runs",
    {
      owner: repository.owner,
      repo: repository.repo,
      name: params.name,
      head_sha: params.headSha,
      details_url: params.detailsUrl,
      external_id: params.externalId,
      status: "in_progress",
      started_at: new Date().toISOString(),
      output: { title: params.title, summary: params.summary },
      headers: GITHUB_API_VERSION_HEADER,
    }
  );
  return String(data.id);
}

export async function completeCheckRun(
  repository: SiteRepository,
  token: string,
  params: CompleteCheckRunParams
): Promise<void> {
  const octokit = createOctokit(token);
  await octokit.request(
    "PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}",
    {
      owner: repository.owner,
      repo: repository.repo,
      check_run_id: Number(params.checkRunId),
      status: "completed",
      conclusion: params.conclusion,
      completed_at: new Date().toISOString(),
      ...(params.detailsUrl ? { details_url: params.detailsUrl } : {}),
      output: {
        title: params.title,
        summary: params.summary,
        ...(params.text ? { text: params.text } : {}),
        ...(params.annotations?.length
          ? { annotations: params.annotations.slice(0, 50) }
          : {}),
      },
      headers: GITHUB_API_VERSION_HEADER,
    }
  );
}

function isSkippedDirectory(directory: string): boolean {
  return directory
    .split("/")
    .some((segment) => CONFIG_SEARCH_SKIPPED_SEGMENTS.has(segment));
}

export async function getDefaultBranch(
  repository: SiteRepository,
  token: string
): Promise<string> {
  const { data } = await createOctokit(token).request(
    "GET /repos/{owner}/{repo}",
    {
      owner: repository.owner,
      repo: repository.repo,
      headers: GITHUB_API_VERSION_HEADER,
    }
  );
  return data.default_branch;
}

async function listBranches(
  repository: SiteRepository,
  token: string
): Promise<string[]> {
  const octokit = createOctokit(token);
  const branches: string[] = [];
  for (let page = 1; branches.length < BRANCH_SUGGESTION_LIMIT; page += 1) {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/branches",
      {
        owner: repository.owner,
        repo: repository.repo,
        per_page: GITHUB_PAGE_SIZE,
        page,
        headers: GITHUB_API_VERSION_HEADER,
      }
    );
    branches.push(...data.map((branch) => branch.name));
    if (data.length < GITHUB_PAGE_SIZE) {
      break;
    }
  }
  return branches.slice(0, BRANCH_SUGGESTION_LIMIT);
}

async function listConfigDirectories(
  repository: SiteRepository,
  token: string,
  ref: string
): Promise<RepositoryTreeScan> {
  const octokit = createOctokit(token);
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner: repository.owner,
      repo: repository.repo,
      tree_sha: ref,
      recursive: "1",
      headers: GITHUB_API_VERSION_HEADER,
    }
  );
  const directories: string[] = [];
  const contentCounts: Record<string, RepositoryContentCount> = {};
  for (const entry of data.tree) {
    if (entry.type !== "blob") {
      continue;
    }
    const path = entry.path ?? "";
    const content = CONTENT_FILE.exec(path);
    if (content) {
      const [, directory = "", section] = content;
      if (
        (section === "blog" || section === "changelog") &&
        !isSkippedDirectory(directory)
      ) {
        const count = contentCounts[directory] ?? { blog: 0, changelog: 0 };
        count[section] += 1;
        contentCounts[directory] = count;
      }
      continue;
    }
    if (
      path !== SITE_CONFIG_FILENAME &&
      !path.endsWith(`/${SITE_CONFIG_FILENAME}`)
    ) {
      continue;
    }
    const directory = path
      .slice(0, -SITE_CONFIG_FILENAME.length)
      .replace(/\/$/, "");
    if (!isSkippedDirectory(directory)) {
      directories.push(directory);
    }
  }
  directories.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return { directories, contentCounts, truncated: data.truncated };
}

export async function getRepositorySuggestions(
  { repository, token }: SiteRepositoryAccess,
  ref: string | null
): Promise<RepositorySuggestions> {
  const scanConfig = async () => {
    const defaultBranch = await getDefaultBranch(repository, token);
    const config = await listConfigDirectories(
      repository,
      token,
      ref || defaultBranch
    ).catch(() => EMPTY_TREE_SCAN);
    return { defaultBranch, config };
  };
  const [branches, { defaultBranch, config }] = await Promise.all([
    listBranches(repository, token),
    scanConfig(),
  ]);
  return {
    branches: branches.includes(defaultBranch)
      ? [
          defaultBranch,
          ...branches.filter((branch) => branch !== defaultBranch),
        ]
      : branches,
    defaultBranch,
    configDirectories: config.directories,
    contentCounts: config.contentCounts,
    truncated: config.truncated,
  };
}
