import {
  GITHUB_MENTION_ACTIVE_CONTENT_BLOCKED_MESSAGE,
  GITHUB_MENTION_LOG_EVENTS,
  GITHUB_MENTION_SANDBOX_ALLOWED_DOMAINS,
  GITHUB_MENTION_SANDBOX_TIMEOUT_MS,
} from "@notra/ai/constants/github-mention";
import { AGENT_DEFAULT_MODEL } from "@notra/ai/constants/models";
import { getGitHubCloneTokenForOrganization } from "@notra/ai/integrations/github";
import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { PublicationRepairScheduler } from "@notra/ai/types/content-publication";
import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
} from "@notra/ai/types/github-mention";
import { reviewGitHubMentionChange } from "@notra/ai/utils/github-mention-change-review";
import { logGitHubMentionEvent } from "@notra/ai/utils/github-mention-log";
import { getGitHubMentionPathBlockReason } from "@notra/ai/utils/github-mention-path-policy";
import { consumeGitHubMentionSandboxStream } from "@notra/ai/utils/github-mention-sandbox-usage";
import { commitFilesToPullRequest } from "@notra/ai/utils/github-pr-commit";
import { syncPublishedPostAfterCommit } from "@notra/ai/utils/update-published-content";
import type { BoxConfig, Runtime, VercelModel } from "@upstash/box";
import { Agent, Box } from "@upstash/box";

const REPO_CLONE_TOKEN_PATH = "/tmp/notra-github-token";
// Same model as the mention agent. Box routes by prefix: without `vercel/` the
// gateway key is sent to Anthropic directly and every run fails with "invalid
// x-api-key". The SDK's model type lags behind the gateway, hence the cast below.
const SANDBOX_MODEL_ID = `vercel/${AGENT_DEFAULT_MODEL}`;

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const SANDBOX_FILE_LIMIT = 25;

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function clonePullRequestBranch(params: {
  box: Awaited<ReturnType<typeof Box.create>>;
  owner: string;
  repo: string;
  branch: string;
  token: string | null;
}) {
  const repositoryUrl = `https://github.com/${params.owner}/${params.repo}.git`;
  const credentialConfig = params.token
    ? // The empty helper first resets the box's global `credential.helper=store`,
      // which would otherwise save the token to ~/.git-credentials for good.
      `-c credential.helper= -c ${shellQuote(
        `credential.helper=!f() { echo username=x-access-token; printf "password=%s\\n" "$(cat ${REPO_CLONE_TOKEN_PATH})"; }; f`
      )}`
    : "";
  const command = [
    "GIT_TERMINAL_PROMPT=0",
    "git",
    credentialConfig,
    "clone",
    "--depth=1",
    "--single-branch",
    "--no-tags",
    "--branch",
    shellQuote(params.branch),
    shellQuote(repositoryUrl),
    shellQuote(params.repo),
  ]
    .filter(Boolean)
    .join(" ");

  try {
    if (params.token) {
      await params.box.files.write({
        path: REPO_CLONE_TOKEN_PATH,
        content: params.token,
      });
      await params.box.exec.command(
        `chmod 600 ${shellQuote(REPO_CLONE_TOKEN_PATH)}`
      );
    }
    const cloneRun = await params.box.exec.command(command);
    if (cloneRun.exitCode !== 0) {
      throw new Error(`git clone exited with code ${cloneRun.exitCode ?? 1}`);
    }
  } finally {
    await params.box.exec
      .command(
        `rm -f ${shellQuote(REPO_CLONE_TOKEN_PATH)} ~/.git-credentials; git config --global --unset-all credential.helper`
      )
      .catch(() => undefined);
  }

  // A leftover credential would let the agent push, so verify instead of trusting the cleanup.
  const leftover = await params.box.exec.command(
    `test ! -e ${shellQuote(REPO_CLONE_TOKEN_PATH)} && test ! -e ~/.git-credentials`
  );
  if (leftover.exitCode !== 0) {
    throw new Error("Could not remove the clone credential from the sandbox");
  }

  await params.box.cd(params.repo);
  const head = await params.box.exec.command("git rev-parse HEAD");
  const baseSha = (head.result ?? "").trim();
  if (!SHA_PATTERN.test(baseSha)) {
    throw new Error("Could not read the cloned commit");
  }
  return baseSha;
}

export async function runGitHubMentionSandbox(params: {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
  instruction: string;
  branch: string;
  expectedHeadOid: string;
  onCommitted: (sha: string) => void;
  onUsage: (usage: AgentTokenUsage) => void;
  scheduleRepair?: PublicationRepairScheduler;
}) {
  const boxApiKey = process.env.UPSTASH_BOX_API_KEY;
  const agentApiKey = process.env.AI_GATEWAY_API_KEY;
  if (!(boxApiKey && agentApiKey)) {
    return {
      available: false as const,
      error:
        "Sandbox is not configured. Read files with getPullRequestFile and commit with commitFilesToPullRequest.",
    };
  }

  if (params.context.destination.mode === "reply_only" || !params.branch) {
    return {
      available: false as const,
      error: "Sandbox commits are only allowed on a pull request branch.",
    };
  }

  // Starting the box takes seconds and does not need the token, so both run at
  // once. A box created while the token lookup fails would otherwise sit there
  // until its own timeout, so it is torn down explicitly.
  const starting = Box.create({
    apiKey: boxApiKey,
    runtime: "node" satisfies Runtime,
    agent: {
      harness: Agent.OpenCode,
      model: SANDBOX_MODEL_ID as VercelModel,
      apiKey: agentApiKey,
    },
    networkPolicy: {
      mode: "custom",
      allowedDomains: [...GITHUB_MENTION_SANDBOX_ALLOWED_DOMAINS],
    },
    timeout: GITHUB_MENTION_SANDBOX_TIMEOUT_MS,
  } satisfies BoxConfig);
  // Nothing awaits the box until the token is in, so a failure in between
  // would otherwise surface as an unhandled rejection. It is still thrown
  // below, where it belongs.
  void starting.catch(() => undefined);

  let token: string | null;
  try {
    token = await getGitHubCloneTokenForOrganization(
      params.context.integrationId,
      params.context.organizationId
    );
  } catch (error) {
    const started = await starting.catch(() => null);
    await started?.delete().catch(() => undefined);
    throw error;
  }
  const box = await starting;

  const startedAt = Date.now();
  logGitHubMentionEvent(GITHUB_MENTION_LOG_EVENTS.sandboxStarted, {
    organizationId: params.context.organizationId,
    integrationId: params.context.integrationId,
    deliveryId: params.context.deliveryId,
    repository: `${params.context.owner}/${params.context.repo}`,
    issueNumber: params.context.issueNumber,
    branch: params.branch,
  });

  try {
    // The box never holds a GitHub credential after the clone: the token file is
    // removed and no git identity or token is configured. The agent can edit the
    // working tree, but only this function can commit, through the API below.
    const baseSha = await clonePullRequestBranch({
      box,
      owner: params.context.owner,
      repo: params.context.repo,
      branch: params.branch,
      token,
    });
    if (baseSha !== params.expectedHeadOid) {
      throw new Error(
        "The branch changed since the mention was read; retry with fresh context."
      );
    }
    const publicationPath = params.context.publication?.path;
    const stream = await box.agent.stream({
      prompt: [
        "You are editing a cloned GitHub pull request branch for Notra.",
        "Apply the requested change in the working tree. Do not run git commit, git push, or any other command that needs credentials; your edits are collected and committed for you.",
        "Keep the change as small as the request allows. Follow the conventions of neighbouring files.",
        "Only content is committed: Markdown, MDX, text, and the JSON, YAML, TOML, or CSV data next to it. Changes to code, scripts, dot files, or build configuration are discarded, so do not make them.",
        publicationPath
          ? `The content Notra published in this pull request is ${publicationPath}.`
          : "",
        `Instruction: ${params.instruction}`,
      ]
        .filter(Boolean)
        .join("\n"),
      timeout: GITHUB_MENTION_SANDBOX_TIMEOUT_MS,
    });
    await consumeGitHubMentionSandboxStream({
      box,
      stream,
      callbacks: {
        onUsage: params.onUsage,
        onUsageUnknown: ({ boxId, runId, reason }) =>
          logGitHubMentionEvent(
            GITHUB_MENTION_LOG_EVENTS.sandboxCompleted,
            {
              organizationId: params.context.organizationId,
              deliveryId: params.context.deliveryId,
              usage: "unknown",
              boxId,
              runId,
              reason,
            },
            "error"
          ),
      },
    });
    const changes = await listChangedSandboxFiles(box, baseSha);
    if (publicationPath && changes.deleted.includes(publicationPath)) {
      changes.skipped.push({
        path: publicationPath,
        reason: "Deleting a linked publication is not supported",
      });
    }
    const reads = await Promise.all(
      changes.written.map(async (path) => ({
        path,
        contents: await box.files.read(path),
      }))
    );
    const readable = reads.filter(
      (file): file is { path: string; contents: string } =>
        typeof file.contents === "string"
    );
    // Same gate as the direct commit tools, and like them all or nothing. A
    // partial commit could land the deletion half of a rename whose new path
    // was blocked, and the content would be gone.
    const review = await reviewGitHubMentionChange({
      octokit: params.octokit,
      context: params.context,
      branch: params.branch,
      files: readable,
    });
    const isBlocked =
      review.blocked.length > 0 ||
      changes.skipped.length > 0 ||
      readable.length !== reads.length;
    for (const finding of review.blocked) {
      changes.skipped.push({ path: finding.path, reason: finding.reason });
    }
    const files = isBlocked ? [] : readable;
    const deletions = isBlocked ? [] : changes.deleted;
    if (files.length === 0 && deletions.length === 0) {
      logGitHubMentionEvent(GITHUB_MENTION_LOG_EVENTS.sandboxCompleted, {
        organizationId: params.context.organizationId,
        deliveryId: params.context.deliveryId,
        commitSha: null,
        files: [],
        skipped: changes.skipped,
        durationMs: Date.now() - startedAt,
      });
      return {
        available: true as const,
        commitSha: null,
        files: [],
        deleted: [],
        skipped: changes.skipped,
        postUpdated: false,
        ...(isBlocked && {
          error: GITHUB_MENTION_ACTIVE_CONTENT_BLOCKED_MESSAGE,
        }),
      };
    }
    const commitSha = await commitFilesToPullRequest({
      octokit: params.octokit,
      owner: params.context.owner,
      repo: params.context.repo,
      branch: params.branch,
      // The commit must apply to exactly the tree the sandbox agent saw.
      expectedHeadOid: baseSha,
      headline: "docs: apply requested changes",
      files,
      deletions,
    });
    params.onCommitted(commitSha);
    const postUpdated = await syncPublishedPostAfterCommit({
      octokit: params.octokit,
      organizationId: params.context.organizationId,
      publication: params.context.publication,
      files,
      commitSha,
      expectedHeadOid: baseSha,
      scheduleRepair: params.scheduleRepair,
      branch: params.branch,
      recordPublicationHead:
        params.context.destination.mode === "same_pull_request",
    });
    if (
      postUpdated &&
      postUpdated.status === "synchronized" &&
      params.context.publication
    ) {
      params.context.publication.headSha = commitSha;
      params.context.publication.markdown = postUpdated.markdown;
    }
    logGitHubMentionEvent(GITHUB_MENTION_LOG_EVENTS.sandboxCompleted, {
      organizationId: params.context.organizationId,
      deliveryId: params.context.deliveryId,
      commitSha,
      files: files.map((file) => file.path),
      deleted: deletions,
      skipped: changes.skipped,
      postUpdated,
      durationMs: Date.now() - startedAt,
    });
    return {
      available: true as const,
      commitSha,
      files: files.map((file) => file.path),
      deleted: deletions,
      skipped: changes.skipped,
      postUpdated,
    };
  } catch (error) {
    logGitHubMentionEvent(
      GITHUB_MENTION_LOG_EVENTS.sandboxCompleted,
      {
        organizationId: params.context.organizationId,
        deliveryId: params.context.deliveryId,
        commitSha: null,
        files: [],
        durationMs: Date.now() - startedAt,
        reason: error instanceof Error ? error.message : String(error),
      },
      "error"
    );
    throw error;
  } finally {
    await box.delete().catch(() => undefined);
  }
}

/**
 * Parses `git diff --name-status` plus `--numstat` output. Exported for tests.
 * Binary files and paths outside the content allowlist are reported instead
 * of committed.
 */
export function parseSandboxChanges(nameStatus: string, numstat: string) {
  const binary = new Set(
    numstat
      .split("\n")
      .filter((line) => line.startsWith("-\t-\t"))
      .map((line) => line.slice("-\t-\t".length))
  );
  const written: string[] = [];
  const deleted: string[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  for (const line of nameStatus.split("\n")) {
    const separator = line.indexOf("\t");
    if (separator < 1) {
      continue;
    }
    const status = line.slice(0, separator);
    const path = line.slice(separator + 1);
    const blockReason = getGitHubMentionPathBlockReason(path);
    if (blockReason) {
      skipped.push({ path, reason: blockReason });
    } else if (status === "D") {
      deleted.push(path);
    } else if (binary.has(path)) {
      skipped.push({ path, reason: "binary files are not supported" });
    } else {
      written.push(path);
    }
  }
  const overflow = [...written, ...deleted].slice(SANDBOX_FILE_LIMIT);
  for (const path of overflow) {
    skipped.push({ path, reason: `more than ${SANDBOX_FILE_LIMIT} files` });
  }
  const allowed = new Set(
    [...written, ...deleted].slice(0, SANDBOX_FILE_LIMIT)
  );
  return {
    written:
      skipped.length > 0 ? [] : written.filter((path) => allowed.has(path)),
    deleted:
      skipped.length > 0 ? [] : deleted.filter((path) => allowed.has(path)),
    skipped,
  };
}

/**
 * Diffs against the cloned commit rather than the index, so local commits by
 * the agent, deleted files, and paths with spaces are all picked up.
 */
async function listChangedSandboxFiles(
  box: Awaited<ReturnType<typeof Box.create>>,
  baseSha: string
) {
  const diff = `git -c core.quotePath=false diff --cached --no-renames ${baseSha}`;
  const add = await box.exec.command("git add -A");
  if (add.exitCode !== 0) {
    throw new Error(`git add exited with code ${add.exitCode ?? 1}`);
  }
  const [nameStatus, numstat] = await Promise.all([
    box.exec.command(`${diff} --name-status`),
    box.exec.command(`${diff} --numstat`),
  ]);
  if (nameStatus.exitCode !== 0 || numstat.exitCode !== 0) {
    throw new Error("git diff failed while collecting sandbox changes");
  }
  return parseSandboxChanges(nameStatus.result ?? "", numstat.result ?? "");
}
