import { createScopedGitHubAppInstallationToken } from "@notra/ai/integrations/github";
import { createOctokit } from "@notra/ai/utils/octokit";
import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";

import { SitePermanentBuildError } from "./errors";

const API_VERSION = { "X-GitHub-Api-Version": "2022-11-28" } as const;
/** Compressed tarball budget; the uncompressed source limit is enforced again in the sandbox. */
const MAX_TARBALL_BYTES = SITE_BUILD_LIMITS.maxSourceBytes;

export interface SiteRepository {
  installationId: string;
  owner: string;
  repo: string;
}

export class SiteRepositoryNotConnectedError extends SitePermanentBuildError {}

export function requireSiteRepository(site: {
  githubInstallationId: string | null;
  repositoryOwner: string | null;
  repositoryName: string | null;
}): SiteRepository {
  if (
    !(site.githubInstallationId && site.repositoryOwner && site.repositoryName)
  ) {
    throw new SiteRepositoryNotConnectedError(
      "This site has no GitHub repository connected"
    );
  }
  return {
    installationId: site.githubInstallationId,
    owner: site.repositoryOwner,
    repo: site.repositoryName,
  };
}

/** Least-privilege token: one repository, only what the operation needs. */
export async function siteRepositoryToken(
  repository: SiteRepository,
  permissions: {
    contents?: "read" | "write";
    checks?: "write";
    pull_requests?: "read" | "write";
  }
): Promise<string> {
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
        ...API_VERSION,
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
  if (declared > MAX_TARBALL_BYTES) {
    throw new SitePermanentBuildError("The repository is too large to build");
  }
  const reader = response.body?.getReader();
  if (!reader) {
    return new Uint8Array(new ArrayBuffer(0));
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > MAX_TARBALL_BYTES) {
      await reader.cancel();
      throw new SitePermanentBuildError("The repository is too large to build");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function getBranchHead(
  repository: SiteRepository,
  token: string,
  branch: string
): Promise<{
  sha: string;
  protected: boolean;
  message: string | null;
  author: string | null;
}> {
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
  return {
    sha: data.commit.sha,
    protected: data.protected,
    message: data.commit.commit.message.split("\n")[0] ?? null,
    author:
      data.commit.commit.author?.name ?? data.commit.author?.login ?? null,
  };
}

export type CheckRunConclusion =
  | "success"
  | "failure"
  | "cancelled"
  | "neutral"
  | "skipped";

export async function createCheckRun(
  repository: SiteRepository,
  token: string,
  params: {
    name: string;
    headSha: string;
    detailsUrl: string;
    externalId: string;
    title: string;
    summary: string;
  }
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
      headers: API_VERSION,
    }
  );
  return String(data.id);
}

export async function completeCheckRun(
  repository: SiteRepository,
  token: string,
  params: {
    checkRunId: string;
    conclusion: CheckRunConclusion;
    title: string;
    summary: string;
    text?: string;
    detailsUrl?: string;
    annotations?: Array<{
      path: string;
      start_line: number;
      end_line: number;
      annotation_level: "failure" | "warning" | "notice";
      message: string;
    }>;
  }
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
      headers: API_VERSION,
    }
  );
}
