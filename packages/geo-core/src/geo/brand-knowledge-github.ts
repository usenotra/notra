import { getGitHubToolRepositoryContextByIntegrationId } from "@notra/ai/integrations/github";
import {
  createOctokit,
  GITHUB_INTERACTIVE_READ_TIMEOUT_MS,
} from "@notra/ai/utils/octokit";

import {
  KNOWLEDGE_MAX_GITHUB_DOCS,
  KNOWLEDGE_MAX_RELEASES,
  KNOWLEDGE_SOURCE_CHARS,
} from "../constants/brand-knowledge";
import type { KnowledgeScanSource } from "../types/brand-knowledge";

type OctokitClient = ReturnType<typeof createOctokit>;

function asMarkdown(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "content" in value) {
    const encoded = (value as { content?: unknown; encoding?: unknown })
      .content;
    if (
      typeof encoded === "string" &&
      (value as { encoding?: unknown }).encoding === "base64"
    ) {
      return Buffer.from(encoded, "base64").toString("utf8");
    }
  }
  return "";
}

async function readGithubFile(
  octokit: OctokitClient,
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const result = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner,
      repo,
      path,
      headers: { accept: "application/vnd.github.raw+json" },
    }
  );
  return asMarkdown(result.data).slice(0, KNOWLEDGE_SOURCE_CHARS);
}

async function collectDocs(
  octokit: OctokitClient,
  owner: string,
  repo: string,
  path: string,
  files: KnowledgeScanSource[]
): Promise<void> {
  if (files.length >= KNOWLEDGE_MAX_GITHUB_DOCS) {
    return;
  }
  let entries: { path?: string; type?: string; name?: string }[] = [];
  try {
    const result = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      { owner, repo, path }
    );
    entries = Array.isArray(result.data) ? result.data : [];
  } catch {
    return;
  }
  for (const entry of entries) {
    if (files.length >= KNOWLEDGE_MAX_GITHUB_DOCS) {
      return;
    }
    if (entry.type === "dir" && entry.path) {
      await collectDocs(octokit, owner, repo, entry.path, files);
      continue;
    }
    if (entry.type !== "file" || !entry.path?.toLowerCase().endsWith(".md")) {
      continue;
    }
    try {
      const markdown = await readGithubFile(octokit, owner, repo, entry.path);
      if (!markdown.trim()) {
        continue;
      }
      files.push({
        origin: "github",
        url: `https://github.com/${owner}/${repo}/blob/HEAD/${entry.path}`,
        path: entry.path,
        markdown,
      });
    } catch {
      // ponytail: skip unreadable docs files rather than failing the scan
    }
  }
}

export async function collectGithubKnowledgeSources(
  organizationId: string,
  integrationId: string
): Promise<KnowledgeScanSource[]> {
  const context = await getGitHubToolRepositoryContextByIntegrationId(
    integrationId,
    { organizationId }
  );
  if (!context.token) {
    throw new Error("GitHub credentials missing");
  }
  const octokit = createOctokit(context.token, {
    requestTimeoutMs: GITHUB_INTERACTIVE_READ_TIMEOUT_MS,
  });
  const sources: KnowledgeScanSource[] = [];
  try {
    const readme = await octokit.request("GET /repos/{owner}/{repo}/readme", {
      owner: context.owner,
      repo: context.repo,
      headers: { accept: "application/vnd.github.raw+json" },
    });
    const markdown = asMarkdown(readme.data).slice(0, KNOWLEDGE_SOURCE_CHARS);
    if (markdown.trim()) {
      sources.push({
        origin: "github",
        url: `https://github.com/${context.owner}/${context.repo}#readme`,
        path: "README",
        markdown,
      });
    }
  } catch {
    // README is optional
  }
  await collectDocs(octokit, context.owner, context.repo, "docs", sources);
  try {
    const changelog = await readGithubFile(
      octokit,
      context.owner,
      context.repo,
      "CHANGELOG.md"
    );
    if (changelog.trim()) {
      sources.push({
        origin: "github",
        url: `https://github.com/${context.owner}/${context.repo}/blob/HEAD/CHANGELOG.md`,
        path: "CHANGELOG.md",
        markdown: changelog,
      });
    }
  } catch {
    // changelog is optional
  }
  try {
    const releases = await octokit.request(
      "GET /repos/{owner}/{repo}/releases",
      {
        owner: context.owner,
        repo: context.repo,
        per_page: KNOWLEDGE_MAX_RELEASES,
      }
    );
    for (const release of releases.data) {
      const body = release.body?.trim();
      if (!body) {
        continue;
      }
      sources.push({
        origin: "github",
        url: release.html_url,
        path: release.tag_name,
        markdown: `${release.name ?? release.tag_name}\n\n${body}`.slice(
          0,
          KNOWLEDGE_SOURCE_CHARS
        ),
      });
    }
  } catch {
    // releases are optional
  }
  return sources;
}
