import {
  CODE_RESEARCH_ALLOWED_DOMAINS,
  CODE_RESEARCH_BOX_NAME_PREFIX,
  CODE_RESEARCH_BOX_REQUEST_TIMEOUT_MS,
  CODE_RESEARCH_BOX_TTL_SECONDS,
  CODE_RESEARCH_BOX_VERIFY_INTERVAL_MS,
  CODE_RESEARCH_CLONE_TIMEOUT_SECONDS,
  CODE_RESEARCH_DISABLE_ENV,
} from "@notra/ai/constants/code-research";
import { BOX_BASE_URL } from "@notra/ai/constants/repo-image";
import type {
  CodeResearchBoxHandle,
  CodeResearchCommandResult,
  CodeResearchRepository,
  CodeResearchTarget,
} from "@notra/ai/types/code-research";
import {
  buildCheckoutScript,
  buildCloneScript,
  parseCommandOutput,
  parseHeadSha,
  wrapCommand,
} from "@notra/ai/utils/code-research-commands";
import { withBoxRetry } from "@notra/ai/utils/repo-image-box";
import { Box, BoxError, EphemeralBox } from "@upstash/box";

const NOT_FOUND_STATUS = 404;
const HOME_DIR = "/workspace/home";

// Tool calls on one research session often land on the same warm function,
// so skip the Box.get + status round trips for recently verified boxes.
const verifiedBoxes = new Map<
  string,
  { box: CodeResearchBoxHandle; verifiedAt: number }
>();

function isBoxGoneError(error: unknown): boolean {
  return error instanceof BoxError && error.statusCode === NOT_FOUND_STATUS;
}

export function isCodeResearchConfigured(): boolean {
  return (
    process.env[CODE_RESEARCH_DISABLE_ENV]?.trim().toLowerCase() !== "off" &&
    Boolean(process.env.UPSTASH_BOX_API_KEY)
  );
}

function requireBoxApiKey(): string {
  const apiKey = process.env.UPSTASH_BOX_API_KEY;
  if (!apiKey) {
    throw new Error("UPSTASH_BOX_API_KEY is not configured");
  }
  return apiKey;
}

function toBasicAuthHeader(token: string): string {
  return `Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
}

export async function runInCodeResearchBox(
  box: CodeResearchBoxHandle,
  script: string,
  options?: { cwd?: string; timeoutSeconds?: number }
): Promise<CodeResearchCommandResult> {
  try {
    const run = await withBoxRetry(() =>
      box.exec.command(wrapCommand(script, options))
    );
    return parseCommandOutput(String(run.result ?? ""), run.exitCode);
  } catch (error) {
    if (isBoxGoneError(error)) {
      verifiedBoxes.delete(box.id);
      throw new Error(
        "The repository sandbox expired. Call open_repository again to get a fresh one."
      );
    }
    throw error;
  }
}

/**
 * Creates an offline-by-default box that can only reach github.com. The
 * GitHub token never enters the box: the Upstash proxy attaches it to
 * outbound github.com requests, so nothing inside can read or leak it.
 */
export async function createCodeResearchBox(params: {
  repository: CodeResearchRepository;
  token: string | null;
}): Promise<{ box: CodeResearchBoxHandle; expiresAt: number }> {
  const box = await withBoxRetry(() =>
    EphemeralBox.create({
      apiKey: requireBoxApiKey(),
      baseUrl: BOX_BASE_URL,
      name: `${CODE_RESEARCH_BOX_NAME_PREFIX}${params.repository.integrationId.slice(0, 12)}-${Date.now().toString(36)}`,
      runtime: "node",
      size: "small",
      ttl: CODE_RESEARCH_BOX_TTL_SECONDS,
      timeout: CODE_RESEARCH_BOX_REQUEST_TIMEOUT_MS,
      networkPolicy: {
        mode: "custom",
        allowedDomains: CODE_RESEARCH_ALLOWED_DOMAINS,
      },
      ...(params.token
        ? {
            attachHeaders: Object.fromEntries(
              CODE_RESEARCH_ALLOWED_DOMAINS.map((domain) => [
                domain,
                { Authorization: toBasicAuthHeader(params.token ?? "") },
              ])
            ),
          }
        : {}),
    })
  );
  verifiedBoxes.set(box.id, { box, verifiedAt: Date.now() });
  return { box, expiresAt: box.expiresAt };
}

export async function attachCodeResearchBox(
  boxId: string
): Promise<CodeResearchBoxHandle | null> {
  const cached = verifiedBoxes.get(boxId);
  if (
    cached &&
    Date.now() - cached.verifiedAt < CODE_RESEARCH_BOX_VERIFY_INTERVAL_MS
  ) {
    return cached.box;
  }
  try {
    const box = await withBoxRetry(() =>
      Box.get(boxId, {
        apiKey: requireBoxApiKey(),
        baseUrl: BOX_BASE_URL,
        timeout: CODE_RESEARCH_BOX_REQUEST_TIMEOUT_MS,
      })
    );
    // Box.get still resolves for deleted boxes; only the status call 404s.
    await withBoxRetry(() => box.getStatus());
    verifiedBoxes.set(boxId, { box, verifiedAt: Date.now() });
    return box;
  } catch (error) {
    if (isBoxGoneError(error)) {
      verifiedBoxes.delete(boxId);
      return null;
    }
    throw error;
  }
}

export async function deleteCodeResearchBox(
  box: CodeResearchBoxHandle
): Promise<void> {
  verifiedBoxes.delete(box.id);
  await box.delete().catch(() => undefined);
}

export async function cloneRepositoryIntoBox(
  box: CodeResearchBoxHandle,
  repository: CodeResearchRepository
): Promise<string> {
  const result = await runInCodeResearchBox(box, buildCloneScript(repository), {
    cwd: HOME_DIR,
    timeoutSeconds: CODE_RESEARCH_CLONE_TIMEOUT_SECONDS,
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `Cloning ${repository.owner}/${repository.repo} failed (exit ${String(result.exitCode)}): ${result.output.trim().slice(-500)}`
    );
  }
  return parseHeadSha(result.output);
}

export async function checkoutTargetInBox(
  box: CodeResearchBoxHandle,
  target: CodeResearchTarget,
  defaultBranch: string
): Promise<string> {
  const result = await runInCodeResearchBox(
    box,
    buildCheckoutScript(target, defaultBranch),
    { timeoutSeconds: CODE_RESEARCH_CLONE_TIMEOUT_SECONDS }
  );
  if (result.exitCode !== 0) {
    throw new Error(
      `Checking out ${JSON.stringify(target)} failed (exit ${String(result.exitCode)}): ${result.output.trim().slice(-500)}`
    );
  }
  return parseHeadSha(result.output);
}
