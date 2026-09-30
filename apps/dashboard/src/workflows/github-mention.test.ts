import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.NOTRA_MENTION_WORKFLOW_TEST !== "1") {
  test("mention workflow admission and replay boundaries", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_MENTION_WORKFLOW_TEST: "1" },
        timeout: 15_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 20_000);
} else {
  const context = {
    deliveryId: "delivery-1",
    organizationId: "org-1",
  } as never;
  const claim = mock(async () => true);
  const complete = mock(async () => undefined);
  const processMention = mock(async () => ({
    status: "committed",
    commitSha: "H2",
  }));
  const writeLog = mock(async () => undefined);
  const startRun = mock(async () => ({ runId: "run-1" }));

  mock.module("@notra/ai/evlog", () => ({
    withEvlog: (handler: unknown) => handler,
    flushLogs: async () => undefined,
  }));
  mock.module("@notra/ai/utils/github-mention-delivery", () => ({
    claimGitHubMentionDelivery: claim,
    completeGitHubMentionDelivery: complete,
  }));
  mock.module("@notra/ai/utils/github-mention-process", () => ({
    processGitHubMention: processMention,
  }));
  mock.module("@notra/ai/utils/github-mention-log", () => ({
    buildAcceptedMentionWebhookLog: () => ({ status: "pending" }),
    buildMentionResultWebhookLog: ({ result }: { result: unknown }) => result,
  }));
  mock.module("@/lib/webhooks/github-mention-log", () => ({
    writeMentionWebhookLog: writeLog,
  }));
  mock.module("@/lib/workflows/start", () => ({
    startGitHubMentionRun: startRun,
    startContentPublicationSyncRepair: async () => undefined,
  }));
  mock.module("workflow", () => ({
    getWorkflowMetadata: () => ({ workflowRunId: "run-1" }),
  }));
  mock.module("next/server", () => ({ after: mock() }));
  mock.module("@notra/ai/utils/github-mention-ingest", () => ({
    ingestGitHubAppMentionWebhook: async () => ({
      httpStatus: 202,
      body: { message: "accepted" },
      context,
    }),
  }));

  const { githubMentionWorkflow } = await import("./github-mention");
  const { processGitHubMentionStep, completeGitHubMentionStep } =
    await import("./steps/github-mention-step");
  const { POST } = await import("../app/api/webhooks/github/app/route");

  beforeEach(() => {
    claim.mockClear();
    claim.mockResolvedValue(true);
    complete.mockClear();
    processMention.mockClear();
    processMention.mockResolvedValue({ status: "committed", commitSha: "H2" });
    writeLog.mockClear();
    startRun.mockClear();
    startRun.mockResolvedValue({ runId: "run-1" });
  });

  test("enqueue failure cannot acknowledge acceptance or claim a delivery", async () => {
    startRun.mockRejectedValueOnce(new Error("queue unavailable"));
    const request = () =>
      new Request("http://localhost/api/webhooks/github/app", {
        method: "POST",
        body: "{}",
      });
    await expect(POST(request() as never)).rejects.toThrow("queue unavailable");
    expect(claim).not.toHaveBeenCalled();
    expect(processMention).not.toHaveBeenCalled();
    expect((await POST(request() as never)).status).toBe(202);
    expect(startRun).toHaveBeenCalledTimes(2);
  });

  test("only the owning workflow processes a delivery", async () => {
    claim.mockResolvedValueOnce(false);
    await githubMentionWorkflow(context);
    expect(processMention).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    await githubMentionWorkflow(context);
    expect(claim).toHaveBeenLastCalledWith("delivery-1", "run-1");
    expect(processMention).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith("delivery-1", "run-1");
  });

  test("an interrupted processing attempt retains its claim and is not retried", async () => {
    processMention.mockRejectedValueOnce(
      new Error("connection lost after write")
    );
    await expect(githubMentionWorkflow(context)).rejects.toThrow(
      "connection lost after write"
    );
    expect(processGitHubMentionStep.maxRetries).toBe(0);
    expect(complete).not.toHaveBeenCalled();
    expect(writeLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "failed" }),
      "delivery-1"
    );
  });

  test("retrying completion never reruns processing", async () => {
    complete.mockRejectedValueOnce(new Error("Redis unavailable"));
    await expect(completeGitHubMentionStep(context, "run-1")).rejects.toThrow(
      "Redis unavailable"
    );
    await completeGitHubMentionStep(context, "run-1");
    expect(processMention).not.toHaveBeenCalled();
  });
}
