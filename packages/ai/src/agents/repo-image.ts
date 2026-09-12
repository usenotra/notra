import {
  AGENT_TIMEOUT_MS,
  BOX_BASE_URL,
  IMAGE_GEN_AGENT_SKILLS_INSTALL_COMMAND,
  IMAGE_GEN_MODEL_ID,
  IMAGE_REVIEW_MODEL_ID,
  MIN_REPO_IMAGE_HTML_BYTES,
  RECOVERY_AGENT_TIMEOUT_MS,
  REPO_IMAGE_OUTPUT_HTML_PATH,
  TRAILING_SLASH_RE,
} from "@notra/ai/constants/repo-image";
import { gateway } from "@notra/ai/gateway";
import {
  getGitHubCloneToken,
  getGitHubCloneTokenForOrganization,
  getGitHubIntegrationById,
  validateRepositoryBranchExists,
} from "@notra/ai/integrations/github";
import {
  buildMarketingAssetExtractionPrompt,
  buildMarketingAssetLogoReviewPrompt,
  buildMarketingAssetMissingOutputPrompt,
  buildMarketingAssetRevisionPrompt,
} from "@notra/ai/prompts/marketing-assets";
import { withRouterDefaults } from "@notra/ai/provider-options";
import type {
  GenerateRepoImageInput,
  GenerateRepoImageResult,
  RepoImageErrorCode,
  RepoImageSourceContext,
} from "@notra/ai/types/repo-image";
import { createOctokit } from "@notra/ai/utils/octokit";
import { withBoxRetry } from "@notra/ai/utils/repo-image-box";
import { renderHtmlToImages } from "@notra/ai/utils/repo-image-render";
import { cleanupRepoImageSandbox } from "@notra/ai/utils/repo-image-sandbox-cleanup";
import {
  injectBrandIdentitySkill,
  injectHumanizerSkill,
} from "@notra/ai/utils/repo-image-skills";
import { extractRepoImageUsage } from "@notra/ai/utils/repo-image-usage";
import { withLongFetchTimeouts } from "@notra/ai/utils/undici-dispatcher";
import type { BoxConfig, Runtime, VercelModel } from "@upstash/box";
import { Agent, Box } from "@upstash/box";
import { generateText, Output } from "ai";
import { z } from "zod";

export class RepoImageError extends Error {
  readonly code: RepoImageErrorCode;
  readonly retryable: boolean;

  constructor(
    code: RepoImageErrorCode,
    message: string,
    options?: { retryable?: boolean }
  ) {
    super(message);
    this.name = "RepoImageError";
    this.code = code;
    this.retryable = options?.retryable ?? true;
  }
}

function getErrorStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

const REPO_CLONE_TOKEN_PATH = "/tmp/notra-github-token";

async function cloneRepositoryToBox(params: {
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
    "--filter=blob:none",
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
  } catch (error) {
    console.error("[repo-image] repository clone failed", {
      owner: params.owner,
      repo: params.repo,
      branch: params.branch,
      error: getErrorMessage(error),
    });
    throw new RepoImageError(
      "clone_failed",
      `Failed to clone ${params.owner}/${params.repo}@${params.branch}. Check that the GitHub integration can read this repository.`,
      { retryable: false }
    );
  } finally {
    if (params.token) {
      await params.box.exec
        .command(`rm -f ${shellQuote(REPO_CLONE_TOKEN_PATH)}`)
        .catch((error: unknown) => {
          console.warn("[repo-image] failed to remove temporary clone token", {
            error: getErrorMessage(error),
          });
        });
    }
  }
}

async function runRepoImageAgentStream(params: {
  box: Awaited<ReturnType<typeof Box.create>>;
  prompt: string;
  timeout: number;
  label: string;
}) {
  const startedAt = Date.now();
  const stream = await params.box.agent.stream({
    prompt: params.prompt,
    timeout: params.timeout,
    options: {
      reasoningEffort: "high",
    },
  });

  for await (const chunk of stream) {
    if (chunk.type === "tool-call") {
      console.log(`[repo-image] ${params.label} tool: ${chunk.toolName}`);
    }
  }

  console.log(
    `[repo-image] ${params.label} stream completed in ${Date.now() - startedAt}ms`
  );

  return {
    cost:
      typeof stream === "object" && stream !== null && "cost" in stream
        ? (stream.cost as unknown)
        : undefined,
  };
}

async function runRepoImageAgentStreamAllowTimeout(
  params: Parameters<typeof runRepoImageAgentStream>[0]
) {
  try {
    return await runRepoImageAgentStream(params);
  } catch (error) {
    if (!isAgentTimeoutError(error)) {
      throw error;
    }

    console.warn(
      `[repo-image] ${params.label} stream timed out after ${params.timeout}ms; checking for ${REPO_IMAGE_OUTPUT_HTML_PATH}`
    );
    return null;
  }
}

async function hasRepoImageOutput(box: Awaited<ReturnType<typeof Box.create>>) {
  const existsRun = await withBoxRetry(() =>
    box.exec.command(
      `test -f ${REPO_IMAGE_OUTPUT_HTML_PATH} && test "$(wc -c < ${REPO_IMAGE_OUTPUT_HTML_PATH})" -ge ${MIN_REPO_IMAGE_HTML_BYTES} && echo ok || echo incomplete`
    )
  );
  return existsRun.result.trim() === "ok";
}

async function installImageGenAgentSkills(params: {
  box: Awaited<ReturnType<typeof Box.create>>;
}) {
  await withBoxRetry(() =>
    params.box.exec.command(IMAGE_GEN_AGENT_SKILLS_INSTALL_COMMAND)
  );
}

function isAgentTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("stream timed out") || message.includes("run timed out")
  );
}

const MISSING_OUTPUT_RECOVERY_ATTEMPTS = 1;

const repoImageLogoReviewSchema = z.object({
  needsRevision: z.boolean(),
  reason: z.string().min(1),
  revisionPrompt: z.string().nullable(),
});

async function reviewRenderedRepoImageForLogoIssues(params: {
  pngBase64: string;
  owner: string;
  repo: string;
  branch: string;
  source: RepoImageSourceContext;
  organizationId?: string;
}) {
  const { output } = await generateText({
    model: gateway(IMAGE_REVIEW_MODEL_ID, {
      organizationId: params.organizationId,
    }),
    output: Output.object({ schema: repoImageLogoReviewSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildMarketingAssetLogoReviewPrompt(params),
          },
          {
            type: "image",
            image: params.pngBase64,
            mediaType: "image/png",
          },
        ],
      },
    ],
    maxOutputTokens: 700,
    providerOptions: withRouterDefaults(undefined, {
      modelId: IMAGE_REVIEW_MODEL_ID,
    }),
  });

  return output;
}

async function buildSourceContext(params: {
  mode: GenerateRepoImageInput["mode"];
  prompt?: string;
  prNumber?: number;
  commitSha?: string;
  owner: string;
  repo: string;
  token: string | null;
}): Promise<RepoImageSourceContext> {
  const { mode, owner, repo, token } = params;

  if (mode === "prompt") {
    return { mode, prompt: params.prompt ?? "" };
  }

  const octokit = createOctokit(token ?? undefined);

  if (mode === "pr") {
    const prNumber = params.prNumber;
    if (prNumber === undefined) {
      throw new RepoImageError("invalid_source", "PR number is required");
    }
    let pr: Awaited<
      ReturnType<
        typeof octokit.request<"GET /repos/{owner}/{repo}/pulls/{pull_number}">
      >
    >["data"];
    let files: Awaited<
      ReturnType<
        typeof octokit.request<"GET /repos/{owner}/{repo}/pulls/{pull_number}/files">
      >
    >["data"];

    try {
      [{ data: pr }, { data: files }] = await Promise.all([
        octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
          owner,
          repo,
          pull_number: prNumber,
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
        }),
        octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/files", {
          owner,
          repo,
          pull_number: prNumber,
          per_page: 10,
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
        }),
      ]);
    } catch (error) {
      if (getErrorStatus(error) === 404) {
        throw new RepoImageError(
          "invalid_source",
          `Pull request #${prNumber} was not found`
        );
      }
      throw error;
    }

    return {
      mode,
      prNumber,
      title: pr.title,
      body: pr.body ?? "",
      filesChanged: pr.changed_files ?? files.length,
      additions: pr.additions ?? 0,
      deletions: pr.deletions ?? 0,
      topFiles: files.map((file) => file.filename),
    };
  }

  const sha = params.commitSha;
  if (!sha) {
    throw new RepoImageError("invalid_source", "Commit SHA is required");
  }
  let commit: Awaited<
    ReturnType<
      typeof octokit.request<"GET /repos/{owner}/{repo}/commits/{ref}">
    >
  >["data"];

  try {
    ({ data: commit } = await octokit.request(
      "GET /repos/{owner}/{repo}/commits/{ref}",
      {
        owner,
        repo,
        ref: sha,
        headers: { "X-GitHub-Api-Version": "2022-11-28" },
      }
    ));
  } catch (error) {
    if (getErrorStatus(error) === 404) {
      throw new RepoImageError("invalid_source", `Commit ${sha} was not found`);
    }
    throw error;
  }

  return {
    mode,
    sha: commit.sha,
    shortSha: commit.sha.slice(0, 7),
    message: commit.commit.message,
    filesChanged: commit.files?.length ?? 0,
    topFiles: (commit.files ?? []).slice(0, 10).map((file) => file.filename),
  };
}

export async function generateRepoImage(params: {
  input: GenerateRepoImageInput;
  userId: string | null;
  restoreSnapshotId?: string | null;
  snapshotName?: string;
}): Promise<GenerateRepoImageResult> {
  const { input, restoreSnapshotId, snapshotName, userId } = params;

  const upstashBoxApiKey = process.env.UPSTASH_BOX_API_KEY;

  if (!upstashBoxApiKey) {
    throw new RepoImageError(
      "missing_config",
      "UPSTASH_BOX_API_KEY is not configured"
    );
  }
  const agentApiKey = process.env.AI_GATEWAY_API_KEY;

  if (!agentApiKey) {
    throw new RepoImageError(
      "missing_config",
      "AI_GATEWAY_API_KEY is not configured"
    );
  }

  const integration = await getGitHubIntegrationById(input.integrationId);
  if (
    !integration ||
    integration.organizationId !== input.organizationId ||
    !integration.enabled
  ) {
    throw new RepoImageError("not_found", "Integration not found");
  }

  const repository = integration.repositories[0];
  if (!repository || !repository.enabled) {
    throw new RepoImageError(
      "not_found",
      "Integration has no repository configured"
    );
  }

  const token = userId
    ? await getGitHubCloneToken(input.integrationId, userId)
    : await getGitHubCloneTokenForOrganization(
        input.integrationId,
        input.organizationId
      );

  await validateRepositoryBranchExists({
    owner: repository.owner,
    repo: repository.repo,
    branch: input.branch,
    token: token ?? undefined,
  });

  const source = await buildSourceContext({
    mode: input.mode,
    prompt: input.prompt,
    prNumber: input.prNumber,
    commitSha: input.commitSha,
    owner: repository.owner,
    repo: repository.repo,
    token,
  });

  return await withLongFetchTimeouts(async () => {
    const runtime = "node" satisfies Runtime;
    const boxConfig = {
      apiKey: upstashBoxApiKey,
      runtime: runtime as Runtime,
      git: {
        ...(token ? { token } : {}),
        userName: "notra-bot",
        userEmail: "bot@usenotra.com",
      },
      agent: {
        harness: Agent.OpenCode,
        model: IMAGE_GEN_MODEL_ID as VercelModel,
        apiKey: agentApiKey,
      },
      timeout: AGENT_TIMEOUT_MS,
    } satisfies BoxConfig;
    const box = restoreSnapshotId
      ? await withBoxRetry(() => Box.fromSnapshot(restoreSnapshotId, boxConfig))
      : await withBoxRetry(() => Box.create(boxConfig));

    let html: string;
    let rendered: Awaited<ReturnType<typeof renderHtmlToImages>>;
    let usage: GenerateRepoImageResult["usage"];
    let snapshot: Awaited<ReturnType<typeof box.snapshot>> | null = null;
    let injectedBrandIdentityId: string | undefined;

    try {
      if (restoreSnapshotId) {
        await withBoxRetry(() => box.cd(repository.repo));
      } else {
        await cloneRepositoryToBox({
          box,
          owner: repository.owner,
          repo: repository.repo,
          branch: input.branch,
          token,
        });
      }

      try {
        await cleanupRepoImageSandbox({ box });
      } catch (error) {
        console.warn("[repo-image] sandbox cleanup skipped after error", error);
      }

      if (!restoreSnapshotId) {
        await installImageGenAgentSkills({ box });
      }
      injectedBrandIdentityId =
        (await injectBrandIdentitySkill({
          box,
          organizationId: input.organizationId,
          brandIdentityId: input.brandIdentityId,
        })) ?? undefined;
      await injectHumanizerSkill({
        box,
        organizationId: input.organizationId,
      });

      const runInitialRepoImageAgent = restoreSnapshotId
        ? runRepoImageAgentStream
        : runRepoImageAgentStreamAllowTimeout;
      const initialRun = await runInitialRepoImageAgent({
        box,
        prompt: restoreSnapshotId
          ? buildMarketingAssetRevisionPrompt({ prompt: input.prompt ?? "" })
          : buildMarketingAssetExtractionPrompt({
              owner: repository.owner,
              repo: repository.repo,
              branch: input.branch,
              source,
            }),
        timeout: AGENT_TIMEOUT_MS,
        label: restoreSnapshotId ? "revision" : "initial",
      });
      usage = extractRepoImageUsage(initialRun?.cost, IMAGE_GEN_MODEL_ID);

      if (!(await hasRepoImageOutput(box))) {
        for (
          let attempt = 1;
          attempt <= MISSING_OUTPUT_RECOVERY_ATTEMPTS;
          attempt++
        ) {
          console.warn(
            `[repo-image] missing ${REPO_IMAGE_OUTPUT_HTML_PATH}; recovery attempt ${attempt}/${MISSING_OUTPUT_RECOVERY_ATTEMPTS}`
          );
          const recoveryRun = await runRepoImageAgentStreamAllowTimeout({
            box,
            prompt: buildMarketingAssetMissingOutputPrompt(),
            timeout: RECOVERY_AGENT_TIMEOUT_MS,
            label: `recovery-${attempt}`,
          });
          usage = mergeRepoImageUsage(
            usage,
            extractRepoImageUsage(recoveryRun?.cost, IMAGE_GEN_MODEL_ID)
          );

          if (await hasRepoImageOutput(box)) {
            break;
          }
        }
      }

      if (!(await hasRepoImageOutput(box))) {
        const diag = await withBoxRetry(() =>
          box.exec.command(
            `pwd 2>&1; echo ---; ls -la 2>&1 | head -50; echo ---; find . /workspace/home -maxdepth 4 -name "output.html" 2>/dev/null`
          )
        );
        console.error(
          "[repo-image] missing output.html, cwd contents:\n",
          diag.result
        );
        throw new RepoImageError(
          "agent_failed",
          `Agent did not produce ${REPO_IMAGE_OUTPUT_HTML_PATH}`
        );
      }

      html = await withBoxRetry(() =>
        box.files.read(REPO_IMAGE_OUTPUT_HTML_PATH)
      );
      rendered = await renderHtmlToImages(html);

      let review: z.infer<typeof repoImageLogoReviewSchema> | null = null;
      try {
        review = await reviewRenderedRepoImageForLogoIssues({
          pngBase64: rendered.pngBase64,
          owner: repository.owner,
          repo: repository.repo,
          branch: input.branch,
          source,
          organizationId: input.organizationId,
        });
      } catch (error) {
        console.warn("[repo-image] logo review skipped after error", error);
      }

      if (review?.needsRevision) {
        const revisionPrompt =
          review.revisionPrompt ??
          "Review the rendered image for unofficial or fabricated company logos. Replace any questionable logos with official assets from the brand-logos skill or real repo assets, or remove them if no official source is available. Preserve the current layout as much as possible.";

        console.log(
          `[repo-image] logo review requested revision: ${review.reason}`
        );

        const reviewRevisionRun = await runRepoImageAgentStream({
          box,
          prompt: buildMarketingAssetRevisionPrompt({
            prompt: revisionPrompt,
          }),
          timeout: RECOVERY_AGENT_TIMEOUT_MS,
          label: "logo-review-revision",
        });
        usage = mergeRepoImageUsage(
          usage,
          extractRepoImageUsage(reviewRevisionRun.cost, IMAGE_GEN_MODEL_ID)
        );

        if (!(await hasRepoImageOutput(box))) {
          throw new RepoImageError(
            "agent_failed",
            `Logo review revision removed ${REPO_IMAGE_OUTPUT_HTML_PATH}`
          );
        }

        html = await withBoxRetry(() =>
          box.files.read(REPO_IMAGE_OUTPUT_HTML_PATH)
        );
        rendered = await renderHtmlToImages(html);
      }

      snapshot = await withBoxRetry(() =>
        box.snapshot({
          name:
            snapshotName ??
            `repo-image-${repository.owner}-${repository.repo}-${Date.now()}`,
        })
      );
    } finally {
      await box.delete().catch((error: unknown) => {
        console.error("Failed to delete repo-image box", error);
      });
    }

    return {
      pngBase64: rendered.pngBase64,
      svg: rendered.svg,
      html,
      brandIdentityId: injectedBrandIdentityId,
      sandbox: snapshot
        ? {
            boxId: readSnapshotString(snapshot, "boxId") ?? box.id,
            snapshotId: readSnapshotString(snapshot, "id"),
            snapshotName: readSnapshotString(snapshot, "name"),
            snapshotSizeBytes: readSnapshotNumber(snapshot, "sizeBytes"),
            snapshotCreatedAt: readSnapshotString(snapshot, "createdAt"),
          }
        : null,
      usage,
    };
  });
}

export async function deleteRepoImageSnapshot(params: {
  boxId?: string;
  snapshotId?: string;
}) {
  if (!params.snapshotId) {
    return;
  }
  if (!process.env.UPSTASH_BOX_API_KEY) {
    throw new RepoImageError(
      "missing_config",
      "UPSTASH_BOX_API_KEY is not configured"
    );
  }

  await withLongFetchTimeouts(async () =>
    withBoxRetry(async () => {
      const baseUrl = BOX_BASE_URL.replace(TRAILING_SLASH_RE, "");
      const response = await fetch(
        params.boxId
          ? `${baseUrl}/v2/box/${params.boxId}/snapshots/${params.snapshotId}`
          : `${baseUrl}/v2/box/snapshots`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-Box-Api-Key": process.env.UPSTASH_BOX_API_KEY ?? "",
          },
          ...(params.boxId
            ? {}
            : { body: JSON.stringify({ ids: [params.snapshotId] }) }),
        }
      );

      if (response.status === 404) {
        return;
      }

      if (!response.ok) {
        throw new RepoImageError(
          "agent_failed",
          `Failed to delete repo image snapshot ${params.snapshotId}: ${response.status} ${response.statusText}`
        );
      }
    })
  );
}

function readSnapshotString(snapshot: unknown, key: string) {
  if (typeof snapshot !== "object" || snapshot === null || !(key in snapshot)) {
    return undefined;
  }
  const value = (snapshot as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function readSnapshotNumber(snapshot: unknown, key: string) {
  if (typeof snapshot !== "object" || snapshot === null || !(key in snapshot)) {
    return undefined;
  }
  const value = (snapshot as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

function mergeRepoImageUsage(
  current: GenerateRepoImageResult["usage"],
  next: GenerateRepoImageResult["usage"]
): GenerateRepoImageResult["usage"] {
  if (!current) {
    return next;
  }
  if (!next) {
    return current;
  }
  return {
    inputTokens: current.inputTokens + next.inputTokens,
    outputTokens: current.outputTokens + next.outputTokens,
    totalTokens: current.totalTokens + next.totalTokens,
    cacheReadTokens: current.cacheReadTokens + next.cacheReadTokens,
    cacheWriteTokens: current.cacheWriteTokens + next.cacheWriteTokens,
    modelId: current.modelId ?? next.modelId,
    computeMs:
      current.computeMs === undefined && next.computeMs === undefined
        ? undefined
        : (current.computeMs ?? 0) + (next.computeMs ?? 0),
    totalUsd:
      current.totalUsd === undefined && next.totalUsd === undefined
        ? undefined
        : (current.totalUsd ?? 0) + (next.totalUsd ?? 0),
    raw: [current.raw, next.raw],
  };
}
