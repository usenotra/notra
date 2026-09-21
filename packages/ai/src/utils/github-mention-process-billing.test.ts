import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_MENTION_PROCESS_BILLING_TEST !== "1") {
  test("mention process settles billing correctly in an isolated module registry", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_MENTION_PROCESS_BILLING_TEST: "1" },
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const confirm = mock(async (_params: unknown) => undefined);
  const release = mock(async (_params: unknown) => undefined);
  const runAgent = mock(
    async (_params: { onUsage: (usage: unknown) => void }) => ({})
  );
  const postReply = mock(async () => "reply");

  mock.module("@notra/ai/agents/github-mention", () => ({
    runGitHubMentionAgent: runAgent,
  }));
  mock.module("@notra/ai/billing/github-mention-billing", () => ({
    reserveGitHubMentionBilling: async () => ({
      allowed: true,
      mode: "pull_request_credits",
      featureId: "pull_request_credits",
      lockId: "lock",
      useMarkup: false,
    }),
    confirmGitHubMentionBilling: confirm,
    releaseGitHubMentionBilling: release,
    describeGitHubMentionBillingDenial: () => "denied",
    createGitHubMentionUsageCollector: () => {
      let usage: unknown = null;
      return { add: (next: unknown) => (usage = next), get: () => usage };
    },
  }));
  mock.module("@notra/ai/integrations/github", () => ({
    isGitHubAppConfigured: () => false,
    getGitHubAppInstallationPublishAccess: async () => null,
  }));
  mock.module("@notra/ai/integrations/github-publish-auth", () => ({
    getGitHubPublishToken: async () => "token",
  }));
  mock.module("@notra/ai/utils/octokit", () => ({ createOctokit: () => ({}) }));
  mock.module("@notra/ai/utils/github-mention-log", () => ({
    logGitHubMentionEvent: () => undefined,
  }));
  mock.module("@notra/ai/utils/github-mention-permissions", () => ({
    findMissingGitHubMentionPermissions: () => [],
    isGitHubPermissionError: () => false,
    buildGitHubMentionPermissionReply: () => "permission",
  }));
  mock.module("@notra/ai/utils/github-mention-rate-limit", () => ({
    consumeGitHubMentionRateLimit: async () => ({ allowed: true }),
  }));
  mock.module("@notra/ai/utils/github-mention-reply-delivery", () => ({
    clipGitHubComment: (value: string) => value,
    postGitHubMentionProposal: async () => "proposal",
    postGitHubMentionReply: postReply,
  }));
  mock.module("@notra/ai/utils/github-mention-reply", () => ({
    buildGitHubMentionRateLimitReply: () => "limited",
    buildGitHubMentionReply: ({ text }: { text: string }) => text,
  }));
  mock.module("@notra/ai/utils/github-pr-comments", () => ({
    addGitHubCommentReaction: async () => null,
    removeGitHubCommentReaction: async () => undefined,
    postGitHubIssueComment: async () => undefined,
  }));
  mock.module("@notra/ai/utils/github-pr-commit", () => ({
    getGitHubChangedFiles: async () => [],
  }));
  mock.module("@notra/ai/utils/retry-write", () => ({
    retryWrite: (write: () => Promise<unknown>) => write(),
  }));

  const { processGitHubMention } = await import("./github-mention-process");
  const context = {
    organizationId: "org",
    integrationId: "integration",
    installationId: 1,
    deliveryId: "delivery",
    owner: "acme",
    repo: "docs",
    issueNumber: 1,
    sender: { id: 1, login: "alice" },
    comment: { id: 2, body: "@notra help", review: null },
    destination: { mode: "same_pull_request" },
    pullRequest: null,
    publication: null,
  } as never;
  const paidUsage = {
    inputTokens: 10,
    outputTokens: 2,
    totalTokens: 12,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalUsd: 0.01,
  };

  test("paid partial failure confirms instead of releasing", async () => {
    runAgent.mockImplementationOnce(async ({ onUsage }) => {
      onUsage(paidUsage);
      throw new Error("later model call failed");
    });
    await processGitHubMention(context);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0]?.[0]).toMatchObject({ usage: paidUsage });
    expect(release).not.toHaveBeenCalled();
  });

  test("zero-work failure releases", async () => {
    confirm.mockClear();
    release.mockClear();
    runAgent.mockRejectedValueOnce(new Error("model never started"));
    await processGitHubMention(context);
    expect(release).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  test("a failure after successful settlement does not settle twice", async () => {
    confirm.mockClear();
    release.mockClear();
    runAgent.mockImplementationOnce(async ({ onUsage }) => {
      onUsage(paidUsage);
      return {
        committed: false,
        commitSha: null,
        pullRequestUrl: null,
        reply: "done",
        declined: false,
        proposals: [],
        permissionDenied: false,
        usage: paidUsage,
      };
    });
    postReply.mockRejectedValueOnce(new Error("reply failed"));
    await processGitHubMention(context);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
  });
}
