import {
  GITHUB_MENTION_LOG_EVENTS,
  GITHUB_MENTION_SANDBOX_TIMEOUT_MS,
} from "@notra/ai/constants/github-mention";
import { getGitHubCloneTokenForOrganization } from "@notra/ai/integrations/github";
import type {
  GitHubMentionContext,
  GitHubMentionOctokit,
} from "@notra/ai/types/github-mention";
import { logGitHubMentionEvent } from "@notra/ai/utils/github-mention-log";
import { commitFilesToPullRequest } from "@notra/ai/utils/github-pr-commit";
import type { BoxConfig, Runtime, VercelModel } from "@upstash/box";
import { Agent, Box } from "@upstash/box";

const REPO_CLONE_TOKEN_PATH = "/tmp/notra-github-token";
const SANDBOX_MODEL_ID = "anthropic/claude-sonnet-4.6";

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
    ? `-c ${shellQuote(
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
    await params.box.cd(params.repo);
  } finally {
    if (params.token) {
      await params.box.exec
        .command(`rm -f ${shellQuote(REPO_CLONE_TOKEN_PATH)}`)
        .catch(() => undefined);
    }
  }
}

export async function runGitHubMentionSandbox(params: {
  octokit: GitHubMentionOctokit;
  context: GitHubMentionContext;
  instruction: string;
  expectedHeadOid: string;
  branch: string;
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

  const token = await getGitHubCloneTokenForOrganization(
    params.context.integrationId,
    params.context.organizationId
  );
  const box = await Box.create({
    apiKey: boxApiKey,
    runtime: "node" satisfies Runtime,
    git: {
      ...(token ? { token } : {}),
      userName: "notra-bot",
      userEmail: "bot@usenotra.com",
    },
    agent: {
      harness: Agent.OpenCode,
      model: SANDBOX_MODEL_ID as VercelModel,
      apiKey: agentApiKey,
    },
    timeout: GITHUB_MENTION_SANDBOX_TIMEOUT_MS,
  } satisfies BoxConfig);

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
    await clonePullRequestBranch({
      box,
      owner: params.context.owner,
      repo: params.context.repo,
      branch: params.branch,
      token,
    });
    const stream = await box.agent.stream({
      prompt: [
        "You are editing a cloned GitHub pull request branch for Notra.",
        "Apply the requested change. Do not commit or push.",
        "Stay on the current branch. Do not force-push.",
        `Instruction: ${params.instruction}`,
      ].join("\n"),
      timeout: GITHUB_MENTION_SANDBOX_TIMEOUT_MS,
    });
    for await (const chunk of stream) {
      void chunk;
    }
    const diffList = await listChangedSandboxFiles(box);
    const files = [];
    for (const path of diffList) {
      const contents = await box.files.read(path);
      if (typeof contents === "string") {
        files.push({ path, contents });
      }
    }
    if (files.length === 0) {
      logGitHubMentionEvent(GITHUB_MENTION_LOG_EVENTS.sandboxCompleted, {
        organizationId: params.context.organizationId,
        deliveryId: params.context.deliveryId,
        commitSha: null,
        files: [],
        durationMs: Date.now() - startedAt,
      });
      return { available: true as const, commitSha: null, files: [] };
    }
    const commitSha = await commitFilesToPullRequest({
      octokit: params.octokit,
      owner: params.context.owner,
      repo: params.context.repo,
      branch: params.branch,
      expectedHeadOid: params.expectedHeadOid,
      headline: "docs: apply mention sandbox edits",
      files,
    });
    logGitHubMentionEvent(GITHUB_MENTION_LOG_EVENTS.sandboxCompleted, {
      organizationId: params.context.organizationId,
      deliveryId: params.context.deliveryId,
      commitSha,
      files: files.map((file) => file.path),
      durationMs: Date.now() - startedAt,
    });
    return {
      available: true as const,
      commitSha,
      files: files.map((file) => file.path),
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

async function listChangedSandboxFiles(
  box: Awaited<ReturnType<typeof Box.create>>
) {
  const result = await box.exec.command(
    "git diff --name-only && git ls-files --others --exclude-standard"
  );
  const output = result.result ?? "";
  return [
    ...new Set(
      output
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.includes(" "))
    ),
  ];
}
