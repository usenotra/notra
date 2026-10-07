import {
  getErrorMessage,
  type RepoImageBox,
  RepoImageError,
  type RepoImageFormatContext,
  type RepoImageFormatRunner,
} from "@notra/ai/agents/repo-image-agent";
import { diagramFormat } from "@notra/ai/agents/repo-image-diagram";
import { marketingFormat } from "@notra/ai/agents/repo-image-marketing";
import {
  AGENT_TIMEOUT_MS,
  BOX_BASE_URL,
  IMAGE_GEN_MODEL_ID,
  TRAILING_SLASH_RE,
} from "@notra/ai/constants/repo-image";
import {
  getGitHubCloneToken,
  getGitHubCloneTokenForOrganization,
  getGitHubIntegrationById,
  validateRepositoryBranchExists,
} from "@notra/ai/integrations/github";
import type { DiagramSpec } from "@notra/ai/types/excalidraw-diagram";
import type {
  GenerateRepoImageInput,
  GenerateRepoImageResult,
  RepoImageFormat,
  RepoImageRender,
  RepoImageSourceContext,
} from "@notra/ai/types/repo-image";
import { createOctokit } from "@notra/ai/utils/octokit";
import { withBoxRetry } from "@notra/ai/utils/repo-image-box";
import { cleanupRepoImageSandbox } from "@notra/ai/utils/repo-image-sandbox-cleanup";
import {
  injectBrandIdentitySkill,
  injectHumanizerSkill,
} from "@notra/ai/utils/repo-image-skills";
import { logError, logWarn } from "@notra/ai/utils/server-log";
import { withLongFetchTimeouts } from "@notra/ai/utils/undici-dispatcher";
import type { BoxConfig, Runtime, VercelModel } from "@upstash/box";
import { Agent, Box } from "@upstash/box";

const FORMAT_RUNNERS: Record<RepoImageFormat, RepoImageFormatRunner> = {
  diagram: diagramFormat,
  marketing: marketingFormat,
};

function getErrorStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : undefined;
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

const REPO_CLONE_TOKEN_PATH = "/tmp/notra-github-token";

async function cloneRepositoryToBox(params: {
  box: RepoImageBox;
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
    logError("[repo-image] Repository clone failed", undefined, {
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
          logWarn("[repo-image] Failed to remove temporary clone token", {
            error: getErrorMessage(error),
          });
        });
    }
  }
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
  /**
   * Latest saved diagram spec. Manual and fast AI edits happen outside the
   * sandbox, so the restored snapshot can hold an older diagram.json.
   */
  restoreDiagramSpec?: DiagramSpec | null;
  snapshotName?: string;
  /** Override for model comparisons; production uses IMAGE_GEN_MODEL_ID. */
  agentModelId?: string;
}): Promise<GenerateRepoImageResult> {
  const { input, restoreDiagramSpec, restoreSnapshotId, snapshotName, userId } =
    params;

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
        model: (params.agentModelId ?? IMAGE_GEN_MODEL_ID) as VercelModel,
        apiKey: agentApiKey,
      },
      timeout: AGENT_TIMEOUT_MS,
    } satisfies BoxConfig;
    const box = restoreSnapshotId
      ? await withBoxRetry(() => Box.fromSnapshot(restoreSnapshotId, boxConfig))
      : await withBoxRetry(() => Box.create(boxConfig));

    const format: RepoImageFormat = input.format ?? "marketing";
    const formatRunner = FORMAT_RUNNERS[format];
    const context: RepoImageFormatContext = {
      box,
      input,
      repository,
      source,
      restoreSnapshotId,
      restoreDiagramSpec,
    };
    let output: RepoImageRender;
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
        logWarn("[repo-image] Sandbox cleanup skipped after error", {
          error: getErrorMessage(error),
        });
      }

      await formatRunner.prepare(context);
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
      output = await formatRunner.run(context);

      snapshot = await withBoxRetry(() =>
        box.snapshot({
          name:
            snapshotName ??
            `repo-image-${repository.owner}-${repository.repo}-${Date.now()}`,
        })
      );
    } finally {
      await box.delete().catch((error: unknown) => {
        logError("[repo-image] Failed to delete box", error);
      });
    }

    return {
      format,
      ...output,
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
